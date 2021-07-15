// const greengrass = require('aws-greengrass-core-sdk');
// const iotData = new greengrass.IotData();
const { IoTDataPlaneClient, GetThingShadowCommand, UpdateThingShadowCommand, DeleteThingShadowCommand } = require("@aws-sdk/client-iot-data-plane");

module.exports.getShadow = async (params) => {

	console.log('getShadow in: params:' + JSON.stringify(params));

	const client = new IoTDataPlaneClient({});

	const command = new GetThingShadowCommand(params);

	const objResult = await client.send(command);

	let result = {};
	if (objResult) {
		const returnArray = Object.values(objResult.payload);

		result = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(returnArray)));
	}

	console.log('getShadow out: result:' + JSON.stringify(result));

	return result;

};

module.exports.updateReportedShadow = async ({thingName, shadowName, reportedState}) => {

	console.log('updateReportedShadow in: thingName:' + thingName);
	console.log('updateReportedShadow in: shadowName:' + shadowName);
	console.log('updateReportedShadow in: reportedState:' + JSON.stringify(reportedState));

	let newParams = {
		thingName: thingName
	}

	if (shadowName) {
		newParams.shadowName = shadowName;
	}

	if (reportedState) {
		newParams.payload = Buffer.from(JSON.stringify({
            "state": {
                "reported": reportedState
            }
		}));
	}

	return await updateShadow(newParams);
};

module.exports.updateDeltaShadow = async ({thingName, shadowName, deltaState}) => {

	console.log('updateDeltaShadow in: thingName:' + thingName);
	console.log('updateDeltaShadow in: shadowName:' + shadowName);
	console.log('updateDeltaShadow in: deltaState:' + JSON.stringify(deltaState));

	let newParams = {
		thingName: params.thingName
	}

	if (shadowName) {
		newParams.shadowName = shadowName;
	}

	if (deltaState) {
		newParams.payload = Buffer.from(JSON.stringify({
            "state": {
                "delta": deltaState
            }
		}));
	}

	return await updateShadow(newParams);
};

module.exports.deleteShadow = async (params) => {

	console.log('deleteShadow in: params:' + JSON.stringify(params));

	const client = new IoTDataPlaneClient({});

	const command = new DeleteThingShadowCommand(params);

	const objResult = await client.send(command);

	let result = {};
	if (objResult) {
		const returnArray = Object.values(objResult.payload);

		result = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(returnArray)));
	}

	console.log('deleteShadow out: result:' + JSON.stringify(result));

	return result;

};

const updateShadow = async (params) => {

	console.log('updateShadow in: params.thingName:' + JSON.stringify(params.thingName));
	console.log('updateShadow in: params.shadowName:' + JSON.stringify(params.shadowName));

	const client = new IoTDataPlaneClient({});

	const command = new UpdateThingShadowCommand(params);

	const objResult = await client.send(command);

	let result = {};
	if (objResult) {
		const returnArray = Object.values(objResult.payload);

		result = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(returnArray)));
	}

	console.log('updateShadow out: result:' + JSON.stringify(result));

	return result;
};