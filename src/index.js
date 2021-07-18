const express = require('express');
const mountRoutes = require('./router');

const storage = require('./api/storage');
const shadow = require('./api/shadow');
const scanner = require('./api/scanner');
const iotHandler = require('./handler/iot');

const GROUP_ID = process.env.GROUP_ID
const AWS_IOT_THING_NAME = process.env.AWS_IOT_THING_NAME;
const AWS_IOT_THING_ARN = process.env.AWS_IOT_THING_ARN;
const AWS_GREENGRASS_GROUP_NAME = process.env.AWS_GREENGRASS_GROUP_NAME;
const CORE_PORT = process.env.CORE_PORT || 8081;
const ACTION_UPDATE = 'UPDATE';
const ACTION_REMOVE = 'REMOVE';


// This is a handler which does nothing for this example
exports.handler = async function(event, context) {
    // console.log('event: ' + JSON.stringify(event));
    // console.log('context: ' + JSON.stringify(context));

    try {
        if (context.clientContext.Custom.subject.indexOf('init_db') > -1) {
            
            await storage.initializeDatabase();

        } else if (context.clientContext.Custom.subject == `$aws/things/${AWS_IOT_THING_NAME}/shadow/update/delta`) {
            console.log('event.state: ' + JSON.stringify(event.state));

            if (!event.state.reservations) {
                console.log('reservations not specified in delta!!');
                return;
            }

            const getShadowResult = await shadow.getShadow({
                thingName: AWS_IOT_THING_NAME
            });

            const results = await Promise.all(Object.entries(getShadowResult.state.desired.reservations)
                .filter(([reservationCode, {listingId, lastRequestOn, action}]) => {
                    return Object.keys(event.state.reservations).includes(reservationCode);
                })
                .map(async ([reservationCode, {listingId, lastRequestOn, action}]) => {

                    if (action == ACTION_REMOVE) {
                        return await iotHandler.removeReservation({
                            reservationCode,
                            listingId,
                            lastRequestOn
                        });
                    } else if (action == ACTION_UPDATE) {
                        return await iotHandler.syncReservation({
                            reservationCode,
                            listingId,
                            lastRequestOn
                        });
                    } else {
                        throw new Error(`Wrong action ${action}!`);
                    }

            }));

            await shadow.updateReportedShadow({
                thingName: AWS_IOT_THING_NAME,
                reportedState: getShadowResult.state.desired
            });

            console.log('removeReservation or syncReservation results:' + JSON.stringify(results));


        } else if (context.clientContext.Custom.subject.indexOf('/delete/accepted') > -1
            && context.clientContext.Custom.subject.indexOf(`$aws/things/${AWS_IOT_THING_NAME}/shadow/name`) > -1) {

            console.log('/shadow/delete/accepted event.state: ' + JSON.stringify(event.state));


        } else if (context.clientContext.Custom.subject.indexOf('find_user') > -1 ) {

            console.log('find_user event.group: ' + event.group);


            await scanner.findUsers({
                group: event.group
            });

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
mountRoutes(app);


app.listen(CORE_PORT, () => console.log(`Example app listening on port ${CORE_PORT}!`));

