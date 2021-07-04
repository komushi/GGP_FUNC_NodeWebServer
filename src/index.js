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
        if (context.clientContext.Custom.subject.indexOf('get_scanners') > -1) {
            let result = await storage.updateScanner({
                terminalKey: 'd6fe7c7a63a72ed4',
                listingId: '3i6cSu',
                // roomCode: '101',
                localIp: '192.168.11.106'
            });

            console.log('updateScanner result: ' + JSON.stringify(result));

            result = await storage.getScanner({
                listingId: event.listingId,
                roomCode: '101'
            });

            console.log('get_scanners result: ' + JSON.stringify(result));

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

