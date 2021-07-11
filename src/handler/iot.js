// iot-handler
const AWS_IOT_THING_NAME = process.env.AWS_IOT_THING_NAME;

const storage = require('../api/storage');
const shadow = require('../api/shadow');
const scanner = require('../api/scanner');


module.exports.syncReservation = async ({listingId, reservationCode}) => {

	// console.log('syncReservationV2 in: event:' + JSON.stringify(event));

	const getShadowResult = await shadow.getShadow({
	    thingName: AWS_IOT_THING_NAME,
	    shadowName: reservationCode
	});

	// console.log('getShadowResult.state: ' + JSON.stringify(getShadowResult.state));

    let reportedMembers = new Map(Object.entries(getShadowResult.state.reported.members));
    let desiredMembers = new Map(Object.entries(getShadowResult.state.desired.members));
	let deltaMembers = new Map();
	if (getShadowResult.state.delta) {
		deltaMembers = new Map(Object.entries(getShadowResult.state.delta.members));
	}

	const toDeleteMembers = new Map();
	reportedMembers.forEach((value, key) => {
  		if (!desiredMembers.has(key)) {
  			toDeleteMembers.set(key, value);
  		}
	});
/*
	const scannerAddresses = await storage.getScanners({});
	if (scannerAddresses.length == 0){
		throw new Error('No scanner registered!! Needs at least one scanner!!');
	}

	const scannerDeletePromises = [];

	toDeleteMembers.forEach(async (member) => {
		scannerDeletePromises.push(scanner.deleteUser({
			listingId: listingId,
			userParam: member
		}));
	})

	const deleteResponse = Promise.all(scannerDeletePromises);

	const scannerDeleteResults = deleteResponse.flatMap(x => x);

	console.log('scannerDeleteResults: ' + JSON.stringify(scannerDeleteResults));

	if (scannerDeleteResults.filter(x => x.code != 0).length > 0) {
		throw new Error('There are scanner.deleteUser errors and process terminated!');
	}
*/
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

    // let deltaReservation = new Map();


	// if (getShadowResult.state.delta.reservation) {
	// 	deltaReservation = getShadowResult.state.delta.reservation;
	// }


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