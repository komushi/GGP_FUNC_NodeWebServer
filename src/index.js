const express = require('express');
const mountRoutes = require('./router');

const storage = require('./api/storage');
const shadow = require('./api/shadow');
const iotHandler = require('./handler/iot');

const GROUP_ID = process.env.GROUP_ID
const AWS_IOT_THING_NAME = process.env.AWS_IOT_THING_NAME;
const AWS_IOT_THING_ARN = process.env.AWS_IOT_THING_ARN;
const AWS_GREENGRASS_GROUP_NAME = process.env.AWS_GREENGRASS_GROUP_NAME;
const PORT = process.env.PORT || 8081;

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
        if (context.clientContext.Custom.subject.indexOf('list_tables') > -1) {
            const tableList = await storage.listTables();

            console.log('tableList: ' + JSON.stringify(tableList));
        } else if (context.clientContext.Custom.subject.indexOf('get_reservation') > -1) {
            const result = await storage.getReservation({
                listingId: event.listingId,
                reservationCode: event.reservationCode
            });

            console.log('result: ' + JSON.stringify(result));

        } else if (context.clientContext.Custom.subject.indexOf('check_shadow') > -1) {
            console.log('event.shadowName:: ' + event.shadowName);

            const getShadowResult = await shadow.getShadow({
                thingName: AWS_IOT_THING_NAME,
                shadowName: event.shadowName
            });

            console.log('getShadowResult caller: ' + JSON.stringify(getShadowResult));

            await storage.saveReservation({
                reservation: getShadowResult.state.desired.reservation,
                members: getShadowResult.state.desired.members,
                version: getShadowResult.version
            });


        } else if (context.clientContext.Custom.subject.indexOf('sync_reservation') > -1) {
            console.log('event.shadowName:: ' + event.shadowName);

            await iotHandler.syncReservation({
                shadowName: event.shadowName
            });

        } else if (context.clientContext.Custom.subject.indexOf('delete_shadow') > -1) {
            console.log('event.shadowName:: ' + event.shadowName);

            const deleteShadowResult = await shadow.deleteShadow({
                thingName: AWS_IOT_THING_NAME,
                shadowName: event.shadowName
            });

            console.error('deleteShadowResult: ' + JSON.stringify(deleteShadowResult));

        } else if (context.clientContext.Custom.subject == `$aws/things/${AWS_IOT_THING_NAME}/shadow/update/delta`) {
            console.log('event.state.reservations:: ' + JSON.stringify(event.state.reservations));

            const results = await Promise.all(Object.entries(event.state.reservations).map(async ([reservationCode, listingId]) => {
                return await iotHandler.syncReservation({
                    reservationCode,
                    listingId
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


app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));


// shadow.getShadow({
//     thingName: AWS_IOT_THING_NAME
// }).then(value => {
//     console.log('getShadow startupShadowResult');
// });


console.log('AWS_IOT_THING_NAME: ' + AWS_IOT_THING_NAME);
console.log('AWS_GREENGRASS_GROUP_NAME: ' + AWS_GREENGRASS_GROUP_NAME);

