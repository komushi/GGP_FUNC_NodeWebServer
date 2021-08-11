const TBL_RESERVATION = process.env.TBL_RESERVATION;
const TBL_MEMBER = process.env.TBL_MEMBER;
const TBL_SCANNER = process.env.TBL_SCANNER;
const TBL_RECORD = process.env.TBL_RECORD;
const TBL_LISTING = process.env.TBL_LISTING;

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

const { DynamoDBClient, DeleteTableCommand, CreateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient(config);

const { DynamoDBDocumentClient, QueryCommand, TransactWriteCommand, DeleteCommand, ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ddbDocClient = DynamoDBDocumentClient.from(client, translateConfig);

module.exports.saveReservation = async ({reservation, members}) => {

  try {
    console.log('saveReservation in: reservation, members:' + JSON.stringify({reservation, members}));

    const reservarionRecord = reservation;

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

module.exports.deleteReservation = async ({listingId, reservationCode}) => {

  console.log('deleteReservation in:' + JSON.stringify({listingId, reservationCode}));

  const param = {
    TableName: TBL_RESERVATION,
    Key: {
      reservationCode: reservationCode,
      listingId: listingId
    }
  };

  const command = new DeleteCommand(param);

  const results = await ddbDocClient.send(command);

  console.log('deleteReservation out: results:' + JSON.stringify(results));

  return results;
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

module.exports.getReservation = async ({reservationCode, listingId}) => {

  console.log('getReservation in: reservationCode:' + reservationCode);
  console.log('getReservation in: listingId:' + listingId);

  const memberCmd = new QueryCommand({
    TableName: TBL_MEMBER,
    KeyConditionExpression: 'reservationCode = :pk',
    ExpressionAttributeValues: {':pk': reservationCode}
  });

  const memberResult = await ddbDocClient.send(memberCmd);

  console.log('getReservation memberResult:' + JSON.stringify(memberResult));

  const reservationCmd = new QueryCommand({
    TableName: TBL_RESERVATION,
    KeyConditionExpression: 'listingId = :pk and reservationCode = :rk',
    ExpressionAttributeValues: {':pk': listingId, ':rk': reservationCode}
  });

  const reservationResult = await ddbDocClient.send(reservationCmd);

  console.log('getReservation reservationResult:' + JSON.stringify(reservationResult));

  if (reservationResult.Items.length == 0) {
    console.log('getReservation out: result: null');
    return null;
  } else {
    const reservation = Object.assign({}, reservationResult.Items[0]);

    const result = {
      reservation: reservation,
      members: memberResult.Items
    };

    console.log('getReservation out: result:' + JSON.stringify(result));

    return result;
  }

};

module.exports.updateScanner = async (record) => {

    console.log('storage-api.updateScanner in: record:' + JSON.stringify(record));

    const scanResult = await fetchScanners({
      terminalKey: record.terminalKey
    });

    const delParams = getDelScannerParams(scanResult.Items);

    await Promise.all(delParams.map(async (param) => {
      const command = new DeleteCommand(param);
      return await ddbDocClient.send(command); 

    }));   

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

    console.log('storage-api.updateScanner out');

    return result;

};

const getDelScannerParams = (records) => {

  console.log('storage-api.getDelScannerParams in: records:' + JSON.stringify(records));

  if (!records) {
    return [];
  }

  const params = records.map(record => {
    return {
      TableName: TBL_SCANNER,
      Key: {
        listingId: record.listingId,
        terminalKey: record.terminalKey
      }
    }
  });

  // console.log('storage-api.getDelScannerParams out: params:' + JSON.stringify(params));
  console.log('storage-api.getDelScannerParams out');

  return params;
};

module.exports.getScannersByTerminalKey = async ({terminalKey}) => {

  console.log('storage-api.getScannersByTerminalKey in:' + JSON.stringify({terminalKey}));

  const scanResult = await fetchScanners({
    terminalKey: record.terminalKey
  });

  const newResult = Promise.all(scanResult.Items.map(async(item) => {

    console.log('storage-api.getScannersByTerminalKey item:' + JSON.stringify(item));

    const getCmd = new GetCommand({
      TableName: TBL_LISTING,
      Key: {
        listingId: item.listingId
      }
    });

    getResult = await ddbDocClient.send(getCmd);

    console.log('storage-api.getScannersByTerminalKey getResult:' + JSON.stringify(getResult));

    item.hostId = getResult.Item.hostId;

    return item;
  }));

  // console.log('storage-api.getScannersByTerminalKey scanResult:' + JSON.stringify(scanResult));
  console.log('storage-api.getScannersByTerminalKey out: newResult:' + JSON.stringify(newResult));

  return newResult;

};

const fetchScanners = async ({terminalKey}) => {

  console.log('storage-api.fetchScanners in:' + JSON.stringify({terminalKey}));

  const scanParam = {
    TableName : TBL_SCANNER,
    FilterExpression: 'terminalKey = :terminalKey',
    ExpressionAttributeValues: {
      ':terminalKey': terminalKey
    }    
  };

  const scanCmd = new ScanCommand(scanParam);

  const scanResult = await ddbDocClient.send(scanCmd);

  console.log('storage-api.fetchScanners out: scanResult:' + JSON.stringify(scanResult));

  return scanResult;


};

module.exports.getScanners = async ({listingId, roomCode}) => {

  console.log('storage-api.getScanners in:' + JSON.stringify({listingId, roomCode}));

  let param;

  if (listingId) {
    if (roomCode) {
      param = {
        TableName : TBL_SCANNER,
        KeyConditionExpression: 'listingId = :listingId',
        FilterExpression: 'roomCode = :roomCode',
        ExpressionAttributeValues: {
          ':listingId': listingId,
          ':roomCode': roomCode
        }    
      };
    } else {
      param = {
        TableName : TBL_SCANNER,
        KeyConditionExpression: 'listingId = :listingId',
        ExpressionAttributeValues: {
          ':listingId': listingId
        }    
      };
    }
  } else {
    throw new Error('getScanners: listingId is required!!')
  }

  const command = new QueryCommand(param);

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
  

  console.log('storage-api.getScanners result:' + JSON.stringify(result));

  return result.Items.map(item => item.localIp);

};

module.exports.saveScanRecord = async (record) => {

  console.log('storage-api.saveScanRecord in: record:', record);

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

  console.log('storage-api.saveScanRecord out: result:' + JSON.stringify(result));

  return result;
};


module.exports.saveMembers = async (records) => {

  console.log('storage-api.saveMembers in: records:', records);

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

  console.log('storage-api.saveMembers out: result:', result);

  return result;
};

module.exports.saveReservationRecord = async (record) => {

  console.log('storage-api.saveReservationRecord in: record:', record);

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

  console.log('storage-api.saveReservationRecord out: result:', result);

  return result;

};

module.exports.getMember = async ({reservationCode, memberNo}) => {

  console.log('storage-api.getMember in:' + JSON.stringify({reservationCode, memberNo}));

  const memberCmd = new QueryCommand({
    TableName: TBL_MEMBER,
    KeyConditionExpression: 'reservationCode = :pk and memberNo = :rk',
    ExpressionAttributeValues: {
      ':pk': reservationCode,
      ':rk': parseInt(memberNo),
    }
  });

  const memberResult = await ddbDocClient.send(memberCmd);

  console.log('storage-api.getMember out: memberResult:' + JSON.stringify(memberResult));

  return memberResult.Items[0];

};

module.exports.updateListing = async ({hostId, listingId}) => {

  console.log('storage-api.updateListing in:' + JSON.stringify({hostId, listingId}));


  const params = [{
    Put: {
      TableName: TBL_LISTING,
      Item: {hostId, listingId},
      ExpressionAttributeNames : {
          '#pk' : 'hostId'
      },
      ConditionExpression: 'attribute_not_exists(#pk)'
    }
  }];

  const command = new TransactWriteCommand({
    TransactItems: params
  });

  const result = await ddbDocClient.send(command);  

  console.log('storage-api.updateListing out: result:' + JSON.stringify(result));

  return;

};


module.exports.initializeDatabase = async () => {

  console.log('storage-api.initializeDatabase in:');

  const listingDeleteCmd = new DeleteTableCommand({
    TableName: TBL_LISTING
  });

  const reservationDeleteCmd = new DeleteTableCommand({
    TableName: TBL_RESERVATION
  });

  const memberDeleteCmd = new DeleteTableCommand({
    TableName: TBL_MEMBER
  });

  const scannerDeleteCmd = new DeleteTableCommand({
    TableName: TBL_SCANNER
  });

  const recordDeleteCmd = new DeleteTableCommand({
    TableName: TBL_RECORD
  });

  const listingCmd = new CreateTableCommand({
    TableName: TBL_LISTING,
    KeySchema: [
      { AttributeName: 'listingId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'listingId', AttributeType: 'S' }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  });

  const reservationCmd = new CreateTableCommand({
    TableName: TBL_RESERVATION,
    KeySchema: [
      { AttributeName: 'listingId', KeyType: 'HASH' },
      { AttributeName: 'reservationCode', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'listingId', AttributeType: 'S' },
      { AttributeName: 'reservationCode', AttributeType: 'S' }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  });


  const memberCmd = new CreateTableCommand({
    TableName: TBL_MEMBER,
    KeySchema: [
      { AttributeName: 'reservationCode', KeyType: 'HASH' },
      { AttributeName: 'memberNo', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'memberNo', AttributeType: 'N' },
      { AttributeName: 'reservationCode', AttributeType: 'S' }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  });


  const scannerCmd = new CreateTableCommand({
    TableName: TBL_SCANNER,
    KeySchema: [
      { AttributeName: 'listingId', KeyType: 'HASH' },
      { AttributeName: 'terminalKey', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'listingId', AttributeType: 'S' },
      { AttributeName: 'terminalKey', AttributeType: 'S' }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  });

  const recordCmd = new CreateTableCommand({
    TableName: TBL_RECORD,
    KeySchema: [
      { AttributeName: 'terminalKey', KeyType: 'HASH' },
      { AttributeName: 'eventTimestamp', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'terminalKey', AttributeType: 'S' },
      { AttributeName: 'eventTimestamp', AttributeType: 'N' }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  });

  const deleteResults = await Promise.allSettled([
    ddbDocClient.send(listingDeleteCmd),
    ddbDocClient.send(reservationDeleteCmd),
    ddbDocClient.send(memberDeleteCmd),
    ddbDocClient.send(scannerDeleteCmd),
    ddbDocClient.send(recordDeleteCmd)
  ]);

  console.log('initializeDatabase deleteResults:' + JSON.stringify(deleteResults));

  const createResults = await Promise.allSettled([
    ddbDocClient.send(listingCmd),
    ddbDocClient.send(reservationCmd),
    ddbDocClient.send(memberCmd),
    ddbDocClient.send(scannerCmd),
    ddbDocClient.send(recordCmd)
  ]);

  console.log('initializeDatabase createResults:' + JSON.stringify(createResults));

  console.log('storage-api.initializeDatabase out');

  return;

};