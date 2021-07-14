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

        if (context.clientContext.Custom.subject.indexOf('find_users') > -1) {
            console.log('event.userName: ' + event.userName);
            console.log('event.userCode: ' + event.userCode);
            
            const result = await scanner.findUsers({
                userName: event.userName,
                userCode: event.userCode,
                group: event.reservationCode
            });
        } else if (context.clientContext.Custom.subject.indexOf('delete_users') > -1) {

            // const userResults = await scanner.findUsers({
            //     group: event.reservationCode
            // });

            // const deleteResults = await Promise.all(userResults.map(async({scannerAddress, users}) =>{
            //     return await scanner.deleteUsers({
            //         scannerAddress: scannerAddress, 
            //         deleteUsersParam: users
            //     });
            // }));

            // await scanner.deleteUsers({
            //     scannerAddress: '192.168.11.106', 
            //     deleteUsersParam: [{
            //         userCode: 'test-3'
            //     }]
            // });

            const FormData = require('form-data');
            const bodyFormData = new FormData();
            bodyFormData.append('userCode', event.userCode);

            const got = require('got');

            const result = await got.post('http://192.168.11.106:8082/service2dev/api/userDelete', {
              body: bodyFormData
            });

            console.log(result.body);


        } else if (context.clientContext.Custom.subject == `$aws/things/${AWS_IOT_THING_NAME}/shadow/update/delta`) {
            console.log('event.state.reservations: ' + JSON.stringify(event.state.reservations));

            const results = await Promise.all(Object.entries(event.state.reservations).map(async ([reservationCode, {listingId, version}]) => {
                return await iotHandler.syncReservation({
                    reservationCode,
                    version
                });

            }));

            console.log('syncReservation results:' + JSON.stringify(results));

        } else if (context.clientContext.Custom.subject.indexOf('/update/delta') > -1 
            && context.clientContext.Custom.subject.indexOf(`$aws/things/${AWS_IOT_THING_NAME}/shadow/name`) > -1) {
            console.log('/shadow/name/update/delta event.state: ' + JSON.stringify(event.state));

            await iotHandler.syncReservation({
                reservationCode: context.clientContext.Custom.subject.split('/update/delta').join('').split('/').pop(),
                version: event.version
            });

        } else if (context.clientContext.Custom.subject.indexOf('/delete/accepted') > -1) {
            console.log('/shadow/delete/accepted event.state: ' + JSON.stringify(event.state));

            await iotHandler.removeReservation({
                reservationCode: context.clientContext.Custom.subject.split('/delete/accepted').join('').split('/').pop()
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


// shadow.getShadow({
//     thingName: AWS_IOT_THING_NAME
// }).then(value => {
//     console.log('getShadow startupShadowResult');
// });


console.log('AWS_IOT_THING_NAME: ' + AWS_IOT_THING_NAME);
console.log('AWS_GREENGRASS_GROUP_NAME: ' + AWS_GREENGRASS_GROUP_NAME);

