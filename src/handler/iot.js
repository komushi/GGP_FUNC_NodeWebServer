// iot-handler
const AWS_IOT_THING_NAME = process.env.AWS_IOT_THING_NAME;

const storage = require('../api/storage');
const shadow = require('../api/shadow');
const scanner = require('../api/scanner');

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

	    		// await scanner.deleteUsers({listingId: event.listingId, members: getReservationResult.members});
	    		// todo: update face info for this group

	    		await storage.deleteMembers(getReservationResult.members);
	    	} else {
				addMembersParam = getShadowResult.state.desired.members.filter((member, index) => {
					if (getReservationResult.members[index]) {
						return member.lastUpdateOn != getReservationResult.members[index].lastUpdateOn;	
					} else {
						return true;
					}
				});
	    		// todo: update face info for this group
	    	}
	    }
    }

	const scannerAddresses = await storage.getScanners({});
	if (scannerAddresses.length == 0){
		throw new Error('No scanner registered!! Needs at least one scanner!!')
	}

	const scannerDeleteResults = await Promise.all(deleteMembersParam.map(async (member) => {
		return 	await scanner.deleteUser({
			reservation: getShadowResult.state.desired.reservation,
			userParam: member
		});
	}));

	console.log('scannerDeleteResults: ' + JSON.stringify(scannerDeleteResults));

	const scannerAddResults = await Promise.all(addMembersParam.map(async (member) => {
		return 	await scanner.addUser({
			reservation: getShadowResult.state.desired.reservation,
			userParam: member
		});
	}));

	console.log('scannerAddResults: ' + JSON.stringify(scannerAddResults));

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

// const getScannerParams = async ({reservation, addMembersParam, deleteMembersParam}) => {

// 	console.log('getDelMemberParams in: reservation:' + JSON.stringify(reservation));
// 	console.log('getDelMemberParams in: addMembersParam:' + JSON.stringify(addMembersParam));
// 	console.log('getDelMemberParams in: deleteMembersParam:' + JSON.stringify(deleteMembersParam));

//     const scannerResult = await storage.getScanner({
//     	listingId: reservation.listingId
//     });

//     let scannerAddresses = new Map();
//     if (scannerResult.Count == 0) {
// 	    const allScannerResult = await storage.getScanner();
// 	    allScannerResult.Items.forEach(item => {
// 	    	scannerAddresses.add(item.localIp);
// 	    });
//     } else if (scannerResult.Count == 1) {
//     	scannerAddresses.add(scannerResult.Items[0].localIp);
//     } else if (scannerResult.Count > 1) {
// 	    allScannerResult.Items.forEach(item => {
// 	    	scannerAddresses.add(item.localIp);
// 	    });
//     }

//     let params;
//     if (scannerAddress) {
//     	params = {scannerAddress, deleteMembersParam};
//     } else {

//     }

// 	return params;
// };




