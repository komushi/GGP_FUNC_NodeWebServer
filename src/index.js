const express = require('express');
const routerHandler = require('./handler/router');

const storage = require('./api/storage');
const iot = require('./api/iot');
const scanner = require('./api/scanner');
const shadowHandler = require('./handler/shadow');
const iotEventHandler = require('./handler/iotEvent');

const GROUP_ID = process.env.GROUP_ID
const AWS_IOT_THING_NAME = process.env.AWS_IOT_THING_NAME;
const AWS_IOT_THING_ARN = process.env.AWS_IOT_THING_ARN;
const AWS_GREENGRASS_GROUP_NAME = process.env.AWS_GREENGRASS_GROUP_NAME;
const CORE_PORT = process.env.CORE_PORT || 8081;
// const ACTION_UPDATE = 'UPDATE';
// const ACTION_REMOVE = 'REMOVE';


// This is a handler which does nothing for this example
exports.handler = async function(event, context) {
    // console.log('event: ' + JSON.stringify(event));
    // console.log('context: ' + JSON.stringify(context));

    try {
        if (context.clientContext.Custom.subject.indexOf('init_db') > -1) {
            
            await storage.initializeDatabase();

        } else if (context.clientContext.Custom.subject == `$aws/things/${AWS_IOT_THING_NAME}/shadow/update/delta`) {
            console.log('shadow/update/delta event.state:' + JSON.stringify(event.state));

            await iotEventHandler.handler(event);
/*
            if (!event.state.reservations) {
                console.log('reservations not specified in delta!!');
                return;
            }

            const getShadowResult = await iot.getShadow({
                thingName: AWS_IOT_THING_NAME
            });

            const syncResults = await Promise.all(Object.entries(getShadowResult.state.desired.reservations)
                .filter(([reservationCode, {listingId, lastRequestOn, action}]) => {
                    return Object.keys(event.state.reservations).includes(reservationCode);
                })
                .map(async ([reservationCode, {listingId, lastRequestOn, action}]) => {

                    if (action == ACTION_REMOVE) {
                        return await shadowHandler.removeReservation({
                            reservationCode,
                            listingId,
                            lastRequestOn
                        });
                    } else if (action == ACTION_UPDATE) {
                        return await shadowHandler.syncReservation({
                            reservationCode,
                            listingId,
                            lastRequestOn
                        });
                    } else {
                        throw new Error(`Wrong action ${action}!`);
                    }

            }));

            console.log('syncResults:' + JSON.stringify(syncResults));

            await Promise.all(syncResults.map(async(syncResult) => {
                await iot.publish({
                    topic: `gocheckin/${process.env.AWS_IOT_THING_NAME}/reservation_deployed`,
                    payload: JSON.stringify({
                        listingId: syncResult.listingId,
                        reservationCode: syncResult.reservationCode,
                        lastResponse: syncResult.lastRequestOn,
                        clearRequest: syncResult.clearRequest
                    })
                });
            }));

            await iot.updateReportedShadow({
                thingName: AWS_IOT_THING_NAME,
                reportedState: getShadowResult.state.desired
            });
*/

        } else if (context.clientContext.Custom.subject.indexOf('/delete/accepted') > -1
            && context.clientContext.Custom.subject.indexOf(`$aws/things/${AWS_IOT_THING_NAME}/shadow/name`) > -1) {

            console.log('/shadow/delete/accepted event.state: ' + JSON.stringify(event.state));


        } else if (context.clientContext.Custom.subject.indexOf('find_user') > -1 ) {

            console.log('find_user event: ' + JSON.stringify(event));


            await scanner.findUsers(event);

        }

    } catch (err) {
        console.error('!!!!!!error happened at handler error start!!!!!!');
        console.error(err.name);
        console.error(err.message);
        console.error(err.stack);
        console.trace();
        console.error('!!!!!!error happened at handler error end!!!!!!');
    }

    const promise = new Promise(function(resolve, reject) {
      console.log("Promise callback");
      resolve();
    });

    return promise;
};



const app = express();

app.use(express.json()); 
app.use(express.urlencoded({extended: true}));
routerHandler(app);


app.listen(CORE_PORT, () => console.log(`Example app listening on port ${CORE_PORT}!`));


setInterval(async () => {
    await iotEventHandler.handler();
}, 10000);