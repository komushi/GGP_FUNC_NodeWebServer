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

const base_topic = AWS_IOT_THING_NAME + '/web_server_node'
const log_topic = base_topic + '/log'

function publishCallback(err, data) {
    console.log('publishCallback');
    console.log(err);
    console.log(data);
}

// This is a handler which does nothing for this example
exports.handler = async function(event, context) {
    console.log('event: ' + JSON.stringify(event));
    console.log('context: ' + JSON.stringify(context));

    try {
        if (context.clientContext.Custom.subject.indexOf('find_user') > -1) {
            console.log('event.userName: ' + event.userName);
            console.log('event.userCode: ' + event.userCode);
            const result = await scanner.findUser({
                userName: event.userName,
                userCode: event.userCode,
                group: event.reservationCode
            });
        } else if (context.clientContext.Custom.subject.indexOf('get_scanners') > -1) {
            console.log('event.listingId: ' + event.listingId);
            console.log('event.roomCode: ' + event.roomCode);
            
            const scannerAddresses = await storage.getScanners({
                listingId: event.listingId,
                roomCode: event.roomCode
            });
            if (scannerAddresses.length == 0){
                throw new Error('No scanner registered!! Needs at least one scanner!!');
            }

        } else if (context.clientContext.Custom.subject == `$aws/things/${AWS_IOT_THING_NAME}/shadow/update/delta`) {
            console.log('event.state.reservations:: ' + JSON.stringify(event.state.reservations));

            const results = await Promise.all(Object.entries(event.state.reservations).map(async ([reservationCode, {listingId, version}]) => {
                return await iotHandler.syncReservation({
                    reservationCode,
                    listingId,
                    version
                });

            }));

            console.log('syncReservation results:' + JSON.stringify(results));

        } else if (context.clientContext.Custom.subject.indexOf('/shadow/delete/accepted') > -1) {
            console.log('/shadow/delete/accepted event.state:: ' + JSON.stringify(event.state));



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


// shadow.getShadow({
//     thingName: AWS_IOT_THING_NAME
// }).then(value => {
//     console.log('getShadow startupShadowResult');
// });


console.log('AWS_IOT_THING_NAME: ' + AWS_IOT_THING_NAME);
console.log('AWS_GREENGRASS_GROUP_NAME: ' + AWS_GREENGRASS_GROUP_NAME);

