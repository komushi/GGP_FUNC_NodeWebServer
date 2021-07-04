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

	    		await storage.deleteMembers(getReservationResult.members);
	    	} else {
				addMembersParam = getShadowResult.state.desired.members.filter((member, index) => {
					if (getReservationResult.members[index]) {
						return member.lastUpdateOn != getReservationResult.members[index].lastUpdateOn;	
					} else {
						return true;
					}
				});

	    		//todo: update face info for this group				
	    	}

	    }
    }

    await scanner.getScanner({
    	listingId: event.listingId
    });

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