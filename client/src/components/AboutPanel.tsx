import * as React from 'react';
import { useContext, useState } from 'react';
import { CalendarIcon, LightningIcon, PopOutIcon, ScaleIcon, SecureIcon, StarIcon, } from '../icons';
import PoolIcon from '@material-ui/icons/Pool';
import { AuthStateContext } from '../state/AuthContext';
import { accentColor, darkerBackground, inverseText, lighterBackground, NormalBodyText, PanelTitle, StyledButton, SubtleBody, subtleText, AuthButton, AuthButtonText } from '../styles';
import About from './About';
import ViewLog from './ViewLog';
import { ComputeStateContext } from '../state/ComputeStateManager';

import env from '../env';

export default function AboutPanel(props: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const authState = useContext(AuthStateContext);
  const computeState = useContext(ComputeStateContext);

  const closeModal = () => {setModalOpen(false)};
  const openModal = () => {
    setModalOpen(true);
  }

  const { project } = computeState;

  const leftPanel = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      marginLeft: '50px',
      marginBottom: '50px',
      marginRight: '8xp',
    }}>
      <PanelTitle>{`about ${project?.shortName || env.projectName}`}</PanelTitle>
      {/*<SubtleBody>
      //  [zk-optimistic-rollup]
      //</SubtleBody>
      <div style={{ height: '121px' }} />
      <NormalBodyText style={{ wordWrap: 'break-word', marginBottom: '40px', maxWidth: '424px' }}>
        Zkopru is a novel layer-2 scaling solution that
        supports private transfers and private atomic
        swaps between ETH, ERC20, ERC721 at a low cost.
      </NormalBodyText>
      */
      }
      <div style={{ display: 'flex' }}>
        <AuthButton
          onClick={openModal}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AuthButtonText>
              Read More
            </AuthButtonText>
            <div style={{ width: '24px' }} />
            {PopOutIcon}
          </div>
        </AuthButton>
      </div>
    </div>
  )

  const Feature = (props: any) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '42px' }}>
        <div>{props.icon}</div>
        <div style={{ width: '36px' }} />
        <div>{props.children}</div>
      </div>
    )
  }

  const featuresPanel = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '47px',
      paddingBottom: '0px',
      backgroundColor: '#0E2936',
      boxShadow: '3px 3px 0px #5D7078',
      marginRight: '50px',
      marginLeft: '8px',
      marginBottom: '50px'
    }}>
      <div style={{ fontFamily: 'Inconsolata', fontSize: '24px', color: '#95A7AE', fontWeight: 'bold' }}>
        FEATURES
      </div>
      <div style={{ height: '1px', backgroundColor: '#5D7078', marginTop: '6px', marginBottom: '48px' }} />
      <Feature icon={SecureIcon}>zkSNARK Privacy</Feature>
      <Feature icon={ScaleIcon}>Optimistic Rollup Scaling</Feature>
      <Feature icon={StarIcon}>Compliance Compatibility</Feature>
      <Feature icon={LightningIcon}>Instant Withdrawals</Feature>
      <Feature icon={(<PoolIcon htmlColor="#D0FFF7" />)}>Privacy Pool for ERC20/NFTs</Feature>
    </div>
  )

  const aboutModal = (modalOpen) ?
    <ViewLog
      open={modalOpen}
      close={closeModal}
      content={(<About isParticipant={authState.isLoggedIn} />)}
      title={`About the ${project?.shortName || env.projectName} trusted setup`} />
  :
    (<></>);

  return (
    <div style={{ display: 'flex', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
      {leftPanel}
      <div style={{ flex: 1, height: '1px', minWidth: '0px', maxWidth: '264px' }} />
      {/*featuresPanel*/}
      {aboutModal}
    </div>
  );
}
