import React, { Dispatch, useContext, useReducer, useRef } from "react";
import styled, { css } from "styled-components";
import Typography from "@material-ui/core/Typography";
import { AuthStateContext } from "../state/AuthContext";

import {
  accentColor,
  secondAccent,
  textColor,
  PageContainer,
  lighterBackground,
} from "../styles";
import { ContributionState } from "./../types/ceremony";
import Button from "@material-ui/core/Button";
import VirtualList from "./../components/MessageList";
import Paper from "@material-ui/core/Paper";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";

import { ceremonyContributionListener, 
  ceremonyQueueListener, ceremonyQueueListenerUnsub, contributionUpdateListener, countParticipantContributions, getParticipantContributions, getSiteSettings } from "../api/FirestoreApi";
import QueueProgress from './../components/QueueProgress';
import Divider from "@material-ui/core/Divider";
import { IconButton, LinearProgress, Link } from "@material-ui/core";
import { newParticipant, Step, ComputeStateContext, ComputeDispatchContext } from '../state/ComputeStateManager';
import { startWorkerThread } from "../state/Compute";
import TwitterIcon from '@material-ui/icons/Twitter';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: '100%',
      height: 200,
      maxWidth: 650,
      backgroundColor: lighterBackground,
      color: textColor,
    },
    divider: {
      color: accentColor,
      padding: '20px',
    }
  }),
);

const StyledButton = styled(Button)`
  color: accentColor;
  background: lighterBackground;
  border-width: thin;
  border-color: accentColor;

  &:hover {
    border-color: secondAccent;
  }
`

const Acknowledge = ({ contribute }: { contribute: () => void}) => 
  (<div style={{ display: 'grid', paddingTop: '20px' }}>
    <StyledButton variant='outlined' onClick={contribute} 
      style={{color: accentColor, borderWidth: 'thin', borderColor: accentColor }}>
      Launch
    </StyledButton>
   </div>);

const welcomeText = (
  <Typography variant="body1" align="center">
  Welcome to zkparty. This page will allow you to participate in a ceremony. Click to your commence your contribution. 
  </Typography>);


const stepText = (step: string) => (<Typography align="center">{step}</Typography>);

const queueProgressCard = (contrib: ContributionState) => {
  return (
  <QueueProgress 
    {...contrib}
  >
  </QueueProgress>
)};

export const ParticipantSection = () => {
  const state = useContext(ComputeStateContext);
  const dispatch = useContext(ComputeDispatchContext);
  const authState = useContext(AuthStateContext);
  const ceremonyListenerUnsub = useRef<(() => void) | null>(null);
  const classes = useStyles();

  const { step, computeStatus, messages, entropy, participant, contributionState } = state;

  const getParticipant = async () => {
    console.log(`uid: ${authState.authUser.uid} acc.token ${authState.accessToken}`);
    if (dispatch) dispatch({ 
      type: 'SET_PARTICIPANT', 
      data: newParticipant(authState.authUser.uid, authState.authUser.additionalUserInfo?.username), 
      accessToken: authState.accessToken });
  };

  const getEntropy = () => {
    if (dispatch) dispatch({type: 'SET_ENTROPY', data: new Uint8Array(64).map(() => Math.random() * 256)});
    console.debug(`entropy set`);
  };

  const addMessage = (msg: string) => {
    if (dispatch) dispatch({type: 'ADD_MESSAGE', message: msg});
  }

  const handleClick = () => {
    if (dispatch) dispatch({type: 'ACKNOWLEDGE' });
  }
  
  const setContribution = (cs: ContributionState) => {
    if (ceremonyListenerUnsub.current) ceremonyListenerUnsub.current();

    // Only accept new tasks if we're waiting
    if (step !== Step.RUNNING && step !== Step.QUEUED) {
      if (dispatch) dispatch({
        type: 'SET_CEREMONY',
        data: cs,
      });
      ceremonyQueueListener(cs.ceremony.id, updateQueue);
    } else {
      console.log(`Contribution candidate received while running another. ${step}`);
    }
  }

  const updateQueue = (update: any) => {
    if (dispatch) dispatch({
      type: 'UPDATE_QUEUE',
      data: update,
      unsub: ceremonyQueueListenerUnsub,
    });
  }
  
  const logState =  () => {
    const { running,  downloaded,  computed,  uploaded } = computeStatus;
    console.log(`compute step: ${running? 'running' : '-' 
    } ${running && !downloaded  ? 'downloading' :
        running && downloaded && !computed ? 'computing' : 
        running && computed && !uploaded ? 'uploading' : 
        'inactive'}`);
  }; 
  
  const tweetText = (siteSettings: any, contribs: any[]): string => {
    //const siteSettings = await getSiteSettings();
    const EOL = '\n';
    const header = encodeURIComponent(siteSettings.tweetHeader + EOL);
    const footer = encodeURIComponent(siteSettings.tweetFooter);

    let contribsList = '';
    contribs.map(c => {
      contribsList += encodeURIComponent(`Circuit: ${c.ceremony.title}${EOL} Contributor # ${c.queueIndex}${EOL} Hash: ${c.hash}${EOL}`);
    });
    return `https://twitter.com/intent/tweet?text=${header}${contribsList}${footer}`;
  }

  let content = (<></>);
  if (!authState.isLoggedIn) {
    content = (<Typography variant='body1'>Sorry, please login to access this page</Typography>);
  } else {
    //console.debug(`step ${step.toString()}`);
    switch (step) {
      case (Step.NOT_ACKNOWLEDGED): {
        // Display welcome text until the 'go ahead' button is clicked.
        content = (<div>{welcomeText}<Acknowledge contribute={handleClick} /></div>);
        break;
      }
      case (Step.ACKNOWLEDGED): {
        // After 'go ahead' clicked
        // Display status messages for all remaining conditions
        // Initialise - get participant ID, load wasm module
        if (!participant && dispatch) {
          getParticipant().then(() => {
            console.debug('INITIALISED');
            dispatch({type: 'SET_STEP', data: Step.INITIALISED});
          });
          if (!state.worker) startWorkerThread(dispatch);
        }
        content = stepText('Loading compute module...');
        break;
      }
      case (Step.INITIALISED): {
        // Collect entropy
        if (entropy.length == 0) getEntropy();
        content = stepText('Collecting entropy...');
        if (dispatch) dispatch({type: 'SET_STEP', data: Step.ENTROPY_COLLECTED});
        break;
      }
      case (Step.ENTROPY_COLLECTED): {
        // start looking for a ceremony to contribute to
        if (participant) {
          ceremonyListenerUnsub.current = ceremonyContributionListener(participant.uid, authState.isCoordinator, setContribution);
          if (dispatch) getContributionCount(participant.uid, dispatch);
        }
        content = stepText('Starting listener...');
        addMessage('Initialised.');
        if (dispatch) dispatch({ type: 'WAIT' });
        break;
      }
      case (Step.WAITING): {
        // Waiting for a ceremony
        const { contributionCount, userContributions, siteSettings } = state;
        let text=(<></>);
        let tweet = (<></>);
        if (contributionCount) {
          text = stepText(`You have contributed to ${contributionCount} ${contributionCount == 1 ? 'ceremony' : 'ceremonies'}. No further ceremonies are ready for your contribution at the moment.`);
        } else {
          content = stepText('No ceremonies are ready to accept your contribution at the moment.');
        }
        if (userContributions && siteSettings) {
          tweet = (
            <div>
              Tweet your attestation
              <a href={tweetText(siteSettings, userContributions)} target='_blank' >
                  <TwitterIcon fontSize='large' />
              </a>
            </div>);
        }
        content = (
            <div style={{ textAlign: 'center' }} >
              {text}
              {tweet}
            </div>
          );
        break;
      }
      case (Step.QUEUED): {
        // Waiting for a ceremony
        if (contributionState) {
          console.debug(`contribution state: ${JSON.stringify(contributionState)}`);
          content = queueProgressCard(contributionState);
        }
        break;
      }
      case (Step.RUNNING): {
        // We have a ceremony to contribute to. 
        // Download/Compute/Upload
        //logState();

        if (computeStatus.ready && !computeStatus.running && dispatch) {
          // Start the computation
          dispatch({
            type: 'START_COMPUTE',
            ceremonyId: contributionState?.ceremony.id,
            index: contributionState?.queueIndex,
            dispatch,
          });
        }

        const progressPct = state.progress;

        content = (<>
          <Typography variant='h6'>Ceremony: {contributionState?.ceremony.title}</Typography>
          <Typography variant='h3' style={{ paddingTop: '20px' }}>{
              !computeStatus.downloaded ? stepText('Downloading ...')
            : !computeStatus.computed ? stepText('Calculating ...')
            : stepText('Uploading ...') 
          }</Typography>
          <LinearProgress variant="determinate" value={progressPct} style={{ paddingTop: '20px' }} />
          <Typography variant='body2' style={{ paddingTop: '40px' }}>Warning: Closing this page will interrupt your contribution.</Typography>
        </>);
        break;
      }
  }};

  return (
      <div className={classes.root}>
        <Paper variant="outlined" className={classes.root}>
          {content}         
        </Paper>
        <Divider className={classes.divider}/>
        <Paper variant="outlined" className={classes.root}>
          <VirtualList messages={messages}/>
        </Paper>
      </div>
  );
};

const getContributionCount = (participant: string, dispatch: Dispatch<any>) => {
  console.debug(`getContCount...`);
  getSiteSettings().then(
    settings => {
      dispatch({
          type: 'SET_SETTINGS',
          data: settings,
      });
  });
  getParticipantContributions(participant).then(
    contribs => {
        dispatch({
            type: 'SET_CONTRIBUTIONS',
            data: {contributions: contribs, count: contribs.length},
        });
    }
  );
}