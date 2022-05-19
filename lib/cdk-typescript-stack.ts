//import * as appsync from '@aws-cdk/aws-appsync';
import * as appsync from '@aws-cdk/aws-appsync-alpha';

import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
  aws_cognito as cognito, 
  aws_dynamodb as dynamodb,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_iam as iam,
  aws_lambda as lambda
} from 'aws-cdk-lib';

import * as path from 'path';


export class CdkTypescriptStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const postsTable = new dynamodb.Table(this, 'PostsTable', {
      partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      replicationRegions: ['us-east-1']
    });

    const getListLambda = new lambda.Function(this, 'CdkListFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'get-list.handler',
      environment: {
        POSTS_TABLE: postsTable.tableName
      }
    });

    postsTable.grantReadData(getListLambda);

    const userPool = new cognito.UserPool(this, 'CdkAuth', {
      userPoolName: 'CdkAuth',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true
      }
    });

    const webClient = userPool.addClient('web', {
      userPoolClientName: 'web',
      authFlows: {
        userPassword: true,
        userSrp: true
      }
    });

    const api = new appsync.GraphqlApi(this, 'CdkApi', {
      name: 'cdk-api',
      schema: appsync.Schema.fromAsset('schema.api.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool
          }
        },
      },
      
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL
      },
      xrayEnabled: true,
    });

    const postsDS = api.addDynamoDbDataSource('postsTable', postsTable);
    const getListFunctionDS = api.addLambdaDataSource('getListFunction', getListLambda);

    // get list of posts with a lambda
    getListFunctionDS.createResolver({
      typeName: 'Query',
      fieldName: 'getPosts'
    });

    // get list of posts
    // postsDS.createResolver({
    //   typeName: 'Query',
    //   fieldName: 'getPosts',
    //   requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
    //   responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList()
    // });

    // create post
    postsDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'createPost',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('mapping-template/Mutation.createPost.request.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
    });

    new CfnOutput(this, 'GraphQL_URL', { value: api.graphqlUrl });
    
  }
};
