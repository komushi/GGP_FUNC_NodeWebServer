// shadow-handler
const AWS_IOT_THING_NAME = process.env.AWS_IOT_THING_NAME;
const COL_FACE_IMG_URL = process.env.COL_FACE_IMG_URL;

const storage = require('../api/storage');
const iot = require('../api/iot');
const scanner = require('../api/scanner');


module.exports.removeReservation = async ({reservationCode, listingId, lastRequestOn}) => {

	console.log('removeReservation in: ' + JSON.stringify({reservationCode, listingId, lastRequestOn}));

	const getShadowResult = await iot.getShadow({
	    thingName: AWS_IOT_THING_NAME,
	    shadowName: reservationCode
	});

	if (!getShadowResult.state.desired ||
		!getShadowResult.state.desired.lastRequestOn ||
		getShadowResult.state.desired.lastRequestOn != lastRequestOn) {

		throw new Error('syncReservation lastRequestOn validation: does not match!');
	}
	
	const userResults = await scanner.findUsers({
	    listingId: listingId,
	    group: reservationCode
	});

	// delete users at scanners
	const deleteResults = await Promise.all(userResults.map(async({scannerAddress, users}) =>{
		return await scanner.deleteUsers({
			scannerAddress: scannerAddress, 
			deleteUsersParam: users
		});
	}));

    // update local ddb
    const getReservationResult = await storage.getReservation({reservationCode, listingId});

    await storage.deleteReservation({
    	listingId: listingId,
    	reservationCode: reservationCode
    });

    await storage.deleteMembers(getReservationResult.members);

    // delete named shadow
    await iot.deleteShadow({
    	thingName: AWS_IOT_THING_NAME,
    	shadowName: reservationCode    	
    });

	console.log('removeReservation deleteResults:' + JSON.stringify(deleteResults));

	return {reservationCode, listingId, lastRequestOn, clearRequest: true};
	
}

module.exports.syncReservation = async ({reservationCode, listingId, lastRequestOn}) => {

	console.log('syncReservation in: ' + JSON.stringify({reservationCode, listingId, lastRequestOn}));

	const getShadowResult = await iot.getShadow({
	    thingName: AWS_IOT_THING_NAME,
	    shadowName: reservationCode
	});

	if (!getShadowResult.state.desired ||
		!getShadowResult.state.desired.lastRequestOn ||
		getShadowResult.state.desired.lastRequestOn != lastRequestOn) {

		throw new Error('syncReservation lastRequestOn validation: does not match!');
	}

    let reportedMembers = new Map();
    if (getShadowResult.state.reported) {
		if (getShadowResult.state.reported.members) {
			reportedMembers = new Map(Object.entries(getShadowResult.state.reported.members));	
		}
    }

    let desiredMembers = new Map();
    if (getShadowResult.state.desired) {
		if (getShadowResult.state.desired.members) {
			desiredMembers = new Map(Object.entries(getShadowResult.state.desired.members));	
		}
    }

	let deltaMembers = new Map();
	if (getShadowResult.state.delta) {
		if (getShadowResult.state.delta.members) {
			deltaMembers = new Map(Object.entries(getShadowResult.state.delta.members));	
		}
	}
	
	// let listingId = getShadowResult.state.desired.reservation.listingId;

	const toDeleteMembers = new Map();
	reportedMembers.forEach((value, key) => {
  		if (!desiredMembers.has(key)) {
  			toDeleteMembers.set(key, value);
  		}
	});

	// const scannerAddresses = await storage.getScanners({});
	// if (scannerAddresses.length == 0){
	// 	throw new Error('No scanner registered!! Needs at least one scanner!!');
	// }

	// delete users on scanner
	const scannerDeletePromises = [];

	toDeleteMembers.forEach(async (member) => {
		scannerDeletePromises.push(scanner.deleteUser({
			listingId: listingId,
			userParam: member
		}));
	});

	const scannerDeleteResponse = await Promise.all(scannerDeletePromises);

	const scannerDeleteResults = scannerDeleteResponse.flatMap(x => x);

	console.log('scannerDeleteResults: ' + JSON.stringify(scannerDeleteResults));

	if (scannerDeleteResults.filter(x => x.code != 0).length > 0) {
		throw new Error('There are scanner.deleteUser errors and process terminated!');
	}

	// add/update users to scanner
	const scannerUpdatePromises = [];

	deltaMembers.forEach(async (value, key) => {
		console.log('deltaMembers value:' + JSON.stringify(value));
		console.log('deltaMembers key:' + key);

		const userParam = desiredMembers.get(key);
		if (!value.hasOwnProperty(COL_FACE_IMG_URL)) {
			delete userParam[COL_FACE_IMG_URL];
		}

		scannerUpdatePromises.push(scanner.addUser({
			reservation: getShadowResult.state.desired.reservation,
			userParam: userParam
		}));
	});

	const scannerUpdateResponse = await Promise.all(scannerUpdatePromises);

	const scannerUpdateResults = scannerUpdateResponse.flatMap(x => x);

	console.log('scannerUpdateResults: ' + JSON.stringify(scannerUpdateResults));

	if (scannerUpdateResults.filter(x => x.code != 0).length > 0) {
		throw new Error('There are scanner.addUser errors and process terminated!');
	}

    // update local ddb
    await storage.deleteMembers(Array.from(toDeleteMembers.values()));

    await storage.saveReservation({
        reservation: getShadowResult.state.desired.reservation,
        members: Array.from(desiredMembers.values())
    });

	// update shadow
	const reportedState = Object.assign({}, getShadowResult.state.delta);

	toDeleteMembers.forEach((value, key) => {
		if (!reportedState['members']){
			reportedState['members'] ={};
		}
		reportedState['members'][key] = null;
	});

    await iot.updateReportedShadow({
    	thingName: AWS_IOT_THING_NAME,
    	shadowName: reservationCode,
    	reportedState: reportedState
    });


	return {reservationCode, listingId, lastRequestOn};

};

