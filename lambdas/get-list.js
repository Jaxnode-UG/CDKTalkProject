const DynamoDB = require('aws-sdk/clients/dynamodb');

const DocumentClient = new DynamoDB.DocumentClient();
const { POSTS_TABLE} = process.env;

module.exports.handler = async (event, context) => {
  console.log(event);
  const resp = await DocumentClient.scan({
    TableName: POSTS_TABLE,
  }).promise();

  console.log(resp.Items);

  return resp.Items;

  return [];
};
