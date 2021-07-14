// iot-handler
const AWS_IOT_THING_NAME = process.env.AWS_IOT_THING_NAME;
const COL_FACE_IMG_URL = process.env.COL_FACE_IMG_URL;

const storage = require('../api/storage');
const shadow = require('../api/shadow');
const scanner = require('../api/scanner');


module.exports.syncReservation = async ({reservationCode, version}) => {

	// console.log('syncReservationV2 in: event:' + JSON.stringify(event));

	const getShadowResult = await shadow.getShadow({
	    thingName: AWS_IOT_THING_NAME,
	    shadowName: reservationCode
	});

    let reportedMembers = new Map(Object.entries(getShadowResult.state.reported.members));
    let desiredMembers = new Map(Object.entries(getShadowResult.state.desired.members));
	let deltaMembers = new Map();
	if (getShadowResult.state.delta) {
		if (getShadowResult.state.delta.members) {
			deltaMembers = new Map(Object.entries(getShadowResult.state.delta.members));	
		}
	}
	let listingId = getShadowResult.state.desired.reservation.listingId;

	const toDeleteMembers = new Map();
	reportedMembers.forEach((value, key) => {
  		if (!desiredMembers.has(key)) {
  			toDeleteMembers.set(key, value);
  		}
	});

	const scannerAddresses = await storage.getScanners({});
	if (scannerAddresses.length == 0){
		throw new Error('No scanner registered!! Needs at least one scanner!!');
	}

	// delete users on scanner
	const scannerDeletePromises = [];

	toDeleteMembers.forEach(async (member) => {
		scannerDeletePromises.push(scanner.deleteUser({
			listingId: listingId,
			userParam: member
		}));
	})

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

	// update shadow
	const reportedState = Object.assign({}, getShadowResult.state.delta);

	toDeleteMembers.forEach((value, key) => {
		if (!reportedState['members']){
			reportedState['members'] ={};
		}
		reportedState['members'][key] = null;
	});

    const resultUpdatedShadow = await shadow.updateReportedShadow({
    	thingName: AWS_IOT_THING_NAME,
    	shadowName: reservationCode,
    	reportedState: reportedState
    });

    // update local ddb
    await storage.deleteMembers(Array.from(toDeleteMembers.values()));

    await storage.saveReservation({
        reservation: getShadowResult.state.desired.reservation,
        members: Array.from(desiredMembers.values()),
        version: resultUpdatedShadow.version
    });

	return;

};

/*
module.exports.syncReservation = async (event) => {

	console.log('syncReservation in: event:' + JSON.stringify(event));

    const getReservationResult = await storage.getReservation({
        listingId: event.listingId,
        reservationCode: event.reservationCode
    });

    let getShadowResult;

    let addMembersParam = [];
    let deleteMembersParam = [];
    if (getReservationResult) {
	    if (getReservationResult.version == event.version) {
	    	console.log('ShadowReservation considered same as LocalReservation, nothing will be done');
	    	return;
	    } else {
			getShadowResult = await shadow.getShadow({
			    thingName: AWS_IOT_THING_NAME,
			    shadowName: event.reservationCode
			});	    	

	    	if (getShadowResult.state.desired.members.length < getReservationResult.members.length) {

	    		addMembersParam = getShadowResult.state.desired.members;

	    		deleteMembersParam = getReservationResult.members;

	    		await storage.deleteMembers(getReservationResult.members);
	    	} else {
				addMembersParam = getShadowResult.state.desired.members.filter((member, index) => {
					if (getReservationResult.members[index]) {
						// return member.lastUpdateOn != getReservationResult.members[index].lastUpdateOn;
						return true;
					} else {
						return true;
					}
				});
	    	}
	    }
    }

    console.log('deleteMembersParam: ' + JSON.stringify(deleteMembersParam));
    console.log('addMembersParam: ' + JSON.stringify(addMembersParam));

	const scannerAddresses = await storage.getScanners({});
	if (scannerAddresses.length == 0){
		throw new Error('No scanner registered!! Needs at least one scanner!!')
	}

	const deleteResponse = await Promise.all(deleteMembersParam.map(async (member) => {
		return 	await scanner.deleteUser({
			reservation: getShadowResult.state.desired.reservation,
			userParam: member
		});
	}));

	const scannerDeleteResults = deleteResponse.flatMap(x => x);

	console.log('scannerDeleteResults: ' + JSON.stringify(scannerDeleteResults));

	if (scannerDeleteResults.filter(x => x.code != 0).length > 0) {
		throw new Error('There are scanner.deleteUser errors and process terminated!');
	}

	const addResponse = await Promise.all(addMembersParam.map(async (member) => {
		return await scanner.addUser({
			reservation: getShadowResult.state.desired.reservation,
			userParam: member
		});
	}));

	const scannerAddResults = addResponse.flatMap(x => x);

	console.log('scannerAddResults: ' + JSON.stringify(scannerAddResults));

	if (scannerAddResults.filter(x => x.code != 0).length > 0) {
		throw new Error('There are scanner.addUser errors and process terminated!');
	}

    const resultUpdatedShadow = await shadow.updateReportedShadow({
    	thingName: AWS_IOT_THING_NAME,
    	shadowName: event.reservationCode,
    	reportedState: getShadowResult.state.desired
    });

    const result = await storage.saveReservation({
        reservation: getShadowResult.state.desired.reservation,
        members: addMembersParam,
        version: resultUpdatedShadow.version
    });

	console.log('syncReservation out: result: ' + JSON.stringify(result));

	return result;

};

*/