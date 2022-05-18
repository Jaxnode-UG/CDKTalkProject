//import * as appsync from '@aws-cdk/aws-appsync';
import * as appsync from '@aws-cdk/aws-appsync-alpha';

import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_cognito as cognito } from 'aws-cdk-lib';


export class CdkTypescriptStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

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

    const api = new appsync.GraphqlApi(this, 'ContractsApi', {
      name: 'contracts-api',
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

    new CfnOutput(this, 'GraphQL_URL', { value: api.graphqlUrl });
    
  }
};
