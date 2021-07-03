
## create-table-reservation.json
```
{
    "TableName": "GoCheckInReservation",
    "KeySchema": [
      { "AttributeName": "listingId", "KeyType": "HASH" },
      { "AttributeName": "reservationCode", "KeyType": "RANGE" }
    ],
    "AttributeDefinitions": [
      { "AttributeName": "listingId", "AttributeType": "S" },
      { "AttributeName": "reservationCode", "AttributeType": "S" }
    ],
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    }
}

```


## create-table-member.json
```
{
    "TableName": "GoCheckInMember",
    "KeySchema": [
      { "AttributeName": "reservationCode", "KeyType": "HASH" },
      { "AttributeName": "memberNo", "KeyType": "RANGE" }
    ],
    "AttributeDefinitions": [
      { "AttributeName": "reservationCode", "AttributeType": "S" },
      { "AttributeName": "memberNo", "AttributeType": "N" }
    ],
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    }
}

```

## create-table-scanner.json
```
{
    "TableName": "GoCheckInScanner",
    "KeySchema": [
      { "AttributeName": "terminalKey", "KeyType": "HASH" },
      { "AttributeName": "uuid", "KeyType": "RANGE" }
    ],
    "AttributeDefinitions": [
      { "AttributeName": "terminalKey", "AttributeType": "S" },
      { "AttributeName": "uuid", "AttributeType": "S" },
      { "AttributeName": "listingId", "AttributeType": "S" },
      { "AttributeName": "roomCode", "AttributeType": "S" }
    ],
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    }
}

```

## gsi.json
```
[
    {
        "IndexName": "ListingRoomIndex",
        "KeySchema": [
            {
                "AttributeName": "listingId",
                "KeyType": "HASH"
            },
            {
                "AttributeName": "roomCode",
                "KeyType": "RANGE"
            }
        ],
        "Projection": {
            "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
            "ReadCapacityUnits": 10,
            "WriteCapacityUnits": 5
        }
    }
]
```


```
$ aws dynamodb create-table --cli-input-json file://create-table-reservation.json --endpoint-url http://192.168.11.36:8080

$ aws dynamodb create-table --cli-input-json file://create-table-member.json --endpoint-url http://192.168.11.36:8080

$ aws dynamodb create-table --cli-input-json file://create-table-scanner.json --global-secondary-indexes file://gsi.json --endpoint-url http://192.168.11.36:8080
```