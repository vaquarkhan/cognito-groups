# cognito-groups

A sample JavaScript/NodeJS project and documentation for a method of working with AWS Cognito groups to support multiple teirs of user access to a shared account.

## Motivation

AWS Cognito Identity Pools support automatic choosing of an Authenticated and Unauthenticated IAM Role (role).  This is sufficient for many cases such as a mobile app with anonymous users and registered users.

For some cases, additional roles are needed such as an administrative class of user with further elevated rights over a regular registered user.  This is often the case with business applications.

AWS Cognito User Pools support User Groups and there is a provision where a role can be automatically chosen within Identiy Pools based on the users authentication token (a JsonWebToken).  (See "Authenticated role selection" within the Authentication Providers -> Cognito section of Identity Pools).

In my experimenting with this, I was unable to get token selected roles to work to my satisfaction.  The AWS libraries cache tokens and user state and I desired a solution where as soon as user group membership changes and the client user token is refreshed, then the role authorized by the group membership will be available.  I eventually concluded that I was either doing it wrong or the assumptions in AWS about how it should work are vastly different than what I want, so I wrote this example.

### NOTE

If you are an expert with AWS Cognito User Pool groups and software that can choose IAM roles based on a User Group, please contact me.  I'd be happy to do this another way.

## Current Solution

At a high level, the solution is this:

The Cognito User Pool is setup normally and a user group is created to indicated Administrative rights.

The Cognito Identity Pool is setup normally with an authenticated and unauthenticated role.  Within the Identity Pool the Cognito Authentication Provider is setup to point to the User Pool.

A lambda function is called whenever rights associated with the Administrative role is needed.  That lambda function checks the user token for group membership and if present, it uses STS:AssumeRole to get temporary credentials for the administrative role and returns those to the client.

The client takes the temporary credentials, installs them locally in AWS, and performs whatever administrative function is desired.  At present this is tested using client direct calling Lambda functions.  I ran into problems when I tried to have the client access S3 paths that had the user's Cognito identity id UUID in the S3 path.

## Detailed Configuration

The client was created using create-react-app (https://github.com/facebookincubator/create-react-app).

The Lambda function components were created using serverless (https://serverless.com).

The Cognito User Pool should be created using defaults.  Create a user for test purposes.  Create a Group to represent admin membership.  Create a "custom attribute" called account_id, type string.  This will hold the userid of the user account we are admin over.

Create an app client in the user pool.  And on that screen, set the read/write permissions on the custom attribute so it is read only.  it can be set from the command line:

    -- create user
    aws --profile <credentials profile name> cognito-idp sign-up --region us-east-1 --client-id <client app id> --username <username> --password <password>

    -- verify user
    aws --profile <credentials profile name> cognito-idp admin-confirm-sign-up --region us-east-1 --user-pool-id <user pool id> --username <username>

    -- update value of custom attribute
    aws --profile <credentials profile name> cognito-idp admin-update-user-attributes --region us-east-1 --user-pool-id <user pool id> --username <username> --user-attributes Name=custom:account_id,Value=123

    -- show user information
    aws --profile <credentials profile name> cognito-idp admin-get-user --region us-east-1 --user-pool-id <user pool id> --username <username>

The Cognito Identiy Pool should be created using defaults.  It has a default unauthenticated role with a default inline policy:

    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "mobileanalytics:PutEvents",
            "cognito-sync:*"
          ],
          "Resource": [
            "*"
          ]
        }
      ]
    }

The unauthenticated role's trust relationship is, I believe, default.

    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Federated": "cognito-identity.amazonaws.com"
          },
          "Action": "sts:AssumeRoleWithWebIdentity",
          "Condition": {
            "StringEquals": {
              "cognito-identity.amazonaws.com:aud": "<identity pool id <region>:<UUID> >"
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "unauthenticated"
            }
          }
        }
      ]
    }

The Identity Pool authenticated role is given the rights to call the getAwsRoleCred lambda function (and add any other permissions you want for the auth role):

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "mobileanalytics:PutEvents",
                    "cognito-sync:*",
                    "cognito-identity:*"
                ],
                "Resource": [
                    "*"
                ]
            },
            {
                "Action": [
                    "lambda:InvokeFunction"
                ],
                "Resource": [
                    "arn:aws:lambda:us-east-1:XXX4567890:function:getAwsRoleCred-dev-getAwsRoleCred"
                ],
                "Effect": "Allow"
            }
        ]
    }

Note the name of the lambda function.  That is generated from serverless.yml and here I'm not an expert in Lambda function stages.  It named it "dev".  You will need to do something clever here (like add additional roles) for your test and production environments.

The trust relationship for the Auth role is here.  Note "authenticated".

    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Federated": "cognito-identity.amazonaws.com"
          },
          "Action": "sts:AssumeRoleWithWebIdentity",
          "Condition": {
            "StringEquals": {
              "cognito-identity.amazonaws.com:aud": "<identity pool id <region>:<UUID> >"
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated"
            }
          }
        }
      ]
    }

When the lambda functions are deployed by serverless, default inline policies are created:

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": [
                    "logs:CreateLogStream"
                ],
                "Resource": [
                    "arn:aws:logs:us-east-1:XXX4567890:log-group:/aws/lambda/getAwsRoleCred-dev-getAwsRoleCred:*",
                    "arn:aws:logs:us-east-1:XXX4567890:log-group:/aws/lambda/getAwsRoleCred-dev-adminOnlyFcn:*"
                ],
                "Effect": "Allow"
            },
            {
                "Action": [
                    "logs:PutLogEvents"
                ],
                "Resource": [
                    "arn:aws:logs:us-east-1:XXX4567890:log-group:/aws/lambda/getAwsRoleCred-dev-getAwsRoleCred:*:*",
                    "arn:aws:logs:us-east-1:XXX4567890:log-group:/aws/lambda/getAwsRoleCred-dev-adminOnlyFcn:*:*"
                ],
                "Effect": "Allow"
            }
        ]
    }

and this trust relationship:

    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Service": "lambda.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    }

The second lambda function, adminOnlyFcn, exists for demo purposes to demonstrate calling it with elevated privliges.  The adminOnlyFcn also verifies the user's ID token and extracts the custom attribute account_id.

A role is required for the elevated administrative user.  The ARN for this role will be used in the Lambda's serverless.yml config.  Look for "admin_group_name" within the environement section.  This is the role for which the getAwsRoleCred lambda function will provide credentials.

The policy for this role provides whatever elevated rights are needed.  In this case it is to call the test admin lambda function:

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": [
                    "lambda:InvokeFunction"
                ],
                "Resource": [
                    "arn:aws:lambda:us-east-1:XXX4567890:function:getAwsRoleCred-dev-adminOnlyFcn"
                ],
                "Effect": "Allow"
            }
        ]
    }

The trust relationship is very important here.  This role must trust being elevated from the other role.

    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Federated": "cognito-identity.amazonaws.com"
          },
          "Action": "sts:AssumeRoleWithWebIdentity",
          "Condition": {
            "StringEquals": {
              "cognito-identity.amazonaws.com:aud": "us-east-1:<identity pool id <region>:<UUID> >"
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated"
            }
          }
        },
        {
          "Effect": "Allow",
          "Principal": {
            "Service": "lambda.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        },
        {
          "Effect": "Allow",
          "Principal": {
            "AWS": "arn:aws:sts::XXX4567890:assumed-role/getAwsRoleCred-dev-us-east-1-lambdaRole/getAwsRoleCred-dev-getAwsRoleCred"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    }

The code in ```login-test``` is a ReactJS sample showing calling the lambda functions and exercising the rights requests.

Check that the included versions of jQuery, FontAwesome and Bootstrap are to your liking.

Update ```login_test\src\config.js``` with the right values for your installation.

```Home.js``` was configured to test pulling files from S3 in the "Viewer" case.  That is purely for test purposes and roles would need to be setup for that.  Look in the ```getViewer``` function.

This example does not demonstrate user signup.  The Login and Cognito work was adapted from the Serverless Stack tutorial here:  https://serverless-stack.com/

A lot more could be written about this however, as stated above, this is being done for personal reasons.  I may expand this in future.  Since this is in public, feel free to leave feedback and suggestions.

## About

Created by Michael Helmke/Linear Worlds

## License

Software Licensed under an MIT Software License (see LICENSE.txt)
