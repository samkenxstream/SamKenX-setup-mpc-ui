/* Get a canonical list of valid contributions by parsing the verification log. */
const fs = require('fs');
const reader = require('buffered-reader');

const CCT_PREFIX = 'batchUst32';

const run = () => {
    // Read site ls dump. 
    // Generate with: gsutil ls gs://trustedsetup-a86f4.appspot.com/clrfund/circuit01 > circuit01_site.txt
    const gsMap = new Map();

    const readVerif = () => {
        vList = [];
        // Read verification log
        new reader.DataReader ("verification_991.txt", { encoding: "utf8" })
            .on ("error", function (error){
                console.log ("error: " + error);
            })
            .on ("line", function (line){
                const re = new RegExp('contribution #(.+) (.+):');
                //console.log ("line: " + line);
                const m = line.match(re);
                if (m) {
                    const idx = m[1];
                    const uid = m[2];
                
                    //console.log ("match: " + m[1] + ' : ' + m[2]);
                    const queueIndex = gsMap.get(uid);
                    console.log(`${idx} : ${uid} = ${queueIndex}`);
                    vList.push({idx, uid, queueIndex});
                }
            })
            .on ("end", function (){
                console.log ("EOF");
                fs.open("index_c02.html", 'w', (err, fd) => {
                    if (err)  throw err;
                    
                    vList.reverse().forEach(e => {
                        console.log(`${e.idx} : ${e.uid} = ${e.queueIndex}`);
                        fs.write(fd, Buffer.from(`<tr>
                            <td>${e.idx}</td>
                            <td>${e.uid}</td>
                            <td><a href="./${CCT_PREFIX}_${e.queueIndex}_${e.uid}.zkey">${e.queueIndex ? 'download' : 'n/a'}</a></td>
                            <td><a href="./${CCT_PREFIX}_${e.queueIndex}_${e.uid}_verification.log">${e.queueIndex ? 'link' : 'n/a'}</a></td>
                            </tr>`), (err) => {if (err) throw err;});
                    });
                })
            })
            .read ();
    };

    new reader.DataReader ("circuit02_site.txt", { encoding: "utf8" })
    .on ("error", function (error){
        console.log ("error: " + error);
    })
    .on ("line", function (line){
        const re = new RegExp(`${CCT_PREFIX}\_(.+)\_(.+)\.zkey`);
        //console.log ("line: " + line);
        const m = line.match(re);
        if (m) {
            gsMap.set(m[2],m[1]);
            console.log ("gs: " + m[1] + ' : ' + m[2]);
        }
    })
    .on ("end", function (){
        console.log ("EOF site");
        readVerif();
    })
    .read();


}

if (require.main == module) {
    run();
}