const TBL_RESERVATION = process.env.TBL_RESERVATION;
const TBL_MEMBER = process.env.TBL_MEMBER;
const TBL_SCANNER = process.env.TBL_SCANNER;
const TBL_RECORD = process.env.TBL_RECORD;

const config = {
  endpoint: process.env.DDB_ENDPOINT || 'http://localhost:8080',
  region: 'ap-northeast-1',
  accessKeyId: '',
  secretAccessKey: ''
};

const marshallOptions = {
  convertEmptyValues: false,
  removeUndefinedValues: true,
  convertClassInstanceToMap: true
};

const unmarshallOptions = {
  wrapNumbers: false
};

const translateConfig = { marshallOptions, unmarshallOptions };

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient(config);

const { DynamoDBDocumentClient, QueryCommand, TransactWriteCommand, DeleteCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const ddbDocClient = DynamoDBDocumentClient.from(client, translateConfig);

module.exports.saveReservation = async ({reservation, members, version}) => {

  try {
    console.log('saveReservation in: reservation:' + JSON.stringify(reservation));
    console.log('saveReservation in: members:' + JSON.stringify(members));
    console.log('saveReservation in: version:' + version);

    const reservarionRecord = reservation;
    reservarionRecord.version = version;

    const reservationParams = getReservationParams(reservarionRecord);

    const memberParams = getPutMemberParams(members);

    const params = reservationParams.concat(memberParams);

    const command = new TransactWriteCommand({
      TransactItems: params
    });

    const result = await ddbDocClient.send(command).catch(error => {
        console.log('saveReservation out: error:' + JSON.stringify(error))
        throw error;
    });

    console.log('saveReservation out: result:' + JSON.stringify(result));

  } catch (err) {
    console.error('saveReservation out: err:');
    console.error(err);
  }


};

const getReservationParams = (record) => {

  console.log('getReservationParams in: record:' + JSON.stringify(record));

  let params = [];
  if (record) {
    params = [{
      Put: {
        TableName: TBL_RESERVATION,
        Item: record,
        // ExpressionAttributeNames : {
        //     '#pk' : 'listingId'
        // },
        // ConditionExpression: 'attribute_not_exists(#pk)'
      }
    }];
  }

  console.log('getReservationParams out: params:' + JSON.stringify(params));

  return params;

};

const getPutMemberParams = (records) => {

  console.log('getPutMemberParams in: records:' + JSON.stringify(records));

  const params = records.map(record => {
    return {
      Put: {
          TableName: TBL_MEMBER,
          Item: record,
          // ExpressionAttributeNames : {
          //     '#pk' : 'reservationCode'
          // },
          // ConditionExpression: 'attribute_not_exists(#pk)'
        }
      }
  });

  console.log('getPutMemberParams out: params:' + JSON.stringify(params));

  return params;
};

module.exports.saveReservationRecord = async (record) => {

  console.log('saveReservationRecord in: record:', record);

  const params = [{
    Put: {
      TableName: TBL_RESERVATION,
      Item: record,
      ExpressionAttributeNames : {
          '#pk' : 'listingId'
      },
      ConditionExpression: 'attribute_not_exists(#pk)'
    }
  }];

  const command = new TransactWriteCommand({
    TransactItems: params
  });

  const result = await ddbDocClient.send(command);  

  console.log('saveReservationRecord out: result:', result);

  return result;

};

module.exports.saveMembers = async (records) => {

  console.log('saveMembers in: records:', records);

  const params = records.map(reord => {
    return {
      Put: {
          TableName: TBL_MEMBER,
          Item: record,
          ExpressionAttributeNames : {
              '#pk' : 'reservationCode'
          },
          ConditionExpression: 'attribute_not_exists(#pk)'
        }
      }
  });

  const command = new TransactWriteCommand({
    TransactItems: params
  });

  const result = await ddbDocClient.send(command); 

  console.log('saveMembers out: result:', result);

  return result;
};

module.exports.deleteMembers = async (records) => {

  console.log('deleteMembers in: records:' + JSON.stringify(records));

  const params = getDelMemberParams(records);

  const results = await Promise.all(params.map(async (param) => {
    const command = new DeleteCommand(param);
    return await ddbDocClient.send(command); 

  }));

  console.log('deleteMembers out: results:' + JSON.stringify(results));

  return results;
};

const getDelMemberParams = (records) => {

  console.log('getDelMemberParams in: records:' + JSON.stringify(records));

  const params = records.map(record => {
    return {
      TableName: TBL_MEMBER,
      Key: {
        reservationCode: record.reservationCode,
        memberNo: record.memberNo
      }
    }
  });

  console.log('getDelMemberParams out: params:' + JSON.stringify(params));

  return params;
};

module.exports.getReservation = async (params) => {

  console.log('getReservation in: params:' + JSON.stringify(params));

  const memberCmd = new QueryCommand({
    TableName: TBL_MEMBER,
    KeyConditionExpression: 'reservationCode = :pk',
    ExpressionAttributeValues: {':pk': params.reservationCode}
  });

  const memberResult = await ddbDocClient.send(memberCmd);

  console.log('getReservation memberResult:' + JSON.stringify(memberResult));

  const reservationCmd = new QueryCommand({
    TableName: TBL_RESERVATION,
    KeyConditionExpression: 'listingId = :pk and reservationCode = :rk',
    ExpressionAttributeValues: {':pk': params.listingId, ':rk': params.reservationCode}
  });

  const reservationResult = await ddbDocClient.send(reservationCmd);

  console.log('getReservation reservationResult:' + JSON.stringify(reservationResult));

  if (reservationResult.Items.length == 0) {
    console.log('getReservation out: result: null');
    return null;
  } else {
    const reservation = Object.assign({}, reservationResult.Items[0]);
    delete reservation.version;

    const result = {
      version: reservationResult.Items[0].version,
      reservation: reservation,
      members: memberResult.Items
    };

    console.log('getReservation out: result:' + JSON.stringify(result));

    return result;
  }

};

module.exports.updateScanner = async (record) => {

  console.log('updateScanner in: record:' + JSON.stringify(record));

  const params = [{
    Put: {
      TableName: TBL_SCANNER,
      Item: record
    }
  }];



  const command = new TransactWriteCommand({
    TransactItems: params
  });

  const result = await ddbDocClient.send(command);

  console.log('updateScanner out: result:' + JSON.stringify(result));

  return result;

};

module.exports.getScanners = async ({listingId, roomCode}) => {

  console.log('getScanners in: listingId:' + listingId);
  console.log('getScanners in: roomCode:' + roomCode);

  let param;

  if (listingId) {
    if (roomCode) {
      param = {
        TableName : TBL_SCANNER,
        FilterExpression: 'listingId = :listingId and roomCode = :roomCode',
        ExpressionAttributeValues: {
          ':listingId': listingId,
          ':roomCode': roomCode
        }    
      };
    } else {
      param = {
        TableName : TBL_SCANNER,
        FilterExpression: 'listingId = :listingId',
        ExpressionAttributeValues: {
          ':listingId': listingId
        }    
      };
    }
  } else {
    param = {
      TableName : TBL_SCANNER
    };
  }

  const command = new ScanCommand(param);

  let result;
  
  try {
    result = await ddbDocClient.send(command);  
  } catch (err) {
    console.error(`getScanners with listingId: ${listingId} and roomCode: ${roomCode} has err.name: ${err.name}`);
    console.error(`getScanners with listingId: ${listingId} and roomCode: ${roomCode} has err.message: ${err.message}`);
    console.error(err.stack);
    console.trace();

    return [];
  }
  

  console.log('getScanners result:' + JSON.stringify(result));

  return result.Items.map(item => item.localIp);

};

module.exports.saveScanRecord = async (record) => {

  console.log('saveScanRecord in: record:', record);

  const params = [{
    Put: {
      TableName: TBL_RECORD,
      Item: record,
      ExpressionAttributeNames : {
          '#pk' : 'terminalKey'
      },
      ConditionExpression: 'attribute_not_exists(#pk)'
    }
  }];

  const command = new TransactWriteCommand({
    TransactItems: params
  });

  const result = await ddbDocClient.send(command);  

  console.log('saveScanRecord out: result:' + JSON.stringify(result));

  return result;
};
