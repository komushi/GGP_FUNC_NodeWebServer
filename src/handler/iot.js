// iot-handler
const AWS_IOT_THING_NAME = process.env.AWS_IOT_THING_NAME;

const storage = require('../api/storage');
const shadow = require('../api/shadow');

module.exports.syncReservation = async (event) => {

	console.log('syncReservation in: event:' + JSON.stringify(event));

    const getReservationResult = await storage.getReservation({
        listingId: event.listingId,
        reservationCode: event.reservationCode
    });

    let getShadowResult;

    let memberParams = [];
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

	    		memberParams = getShadowResult.state.desired.members;

	    		await storage.deleteMembers(getReservationResult.members);

	    		//todo: clear face info for this group    		
	    	} else {
				memberParams = getShadowResult.state.desired.members.filter((member, index) => {
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

    const resultUpdatedShadow = await shadow.updateReportedShadow({
    	thingName: AWS_IOT_THING_NAME,
    	shadowName: event.reservationCode,
    	reportedState: getShadowResult.state.desired
    });

    const result = await storage.saveReservation({
        reservation: getShadowResult.state.desired.reservation,
        members: memberParams,
        version: resultUpdatedShadow.version
    });

	console.log('syncReservation out: result: ' + JSON.stringify(result));

	return result;

};