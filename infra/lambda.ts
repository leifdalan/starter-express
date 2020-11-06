import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';

export function createLambda() {
  const runtime = 'nodejs12.x';

  const role = new aws.iam.Role('lambda-role', {
    
    assumeRolePolicy: JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [{
            "Effect": "Allow",
            "Principal": {
               "Service": [
                  "lambda.amazonaws.com",
                  "edgelambda.amazonaws.com"
               ]
            },
            "Action": "sts:AssumeRole"
         }
        ]

    })
  });

  const rolePolicy = new aws.iam.RolePolicy("lambda-rolePolicy", {
    role: role,
    policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
          "Effect": "Allow",
          "Action": [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents"
          ],
          "Resource": "*"
      }]
    })
  });

  const policy = new aws.iam.Policy("lambda-policy", {
    policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
          "Effect": "Allow",
          "Action": [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents"
          ],
          "Resource": "*"
      }]
    })
  });   

  new aws.iam.RolePolicyAttachment("lambda-attachment", {
    role: role,
    policyArn: policy.arn
  });

  const code = new pulumi.asset.FileArchive('../express.zip');
  const lambda =  new aws.lambda.Function('remix-app', { 
    runtime, 
    memorySize: 2048,
    handler: 'lambda-handler.handler', 
    role: role.arn, 
    code, 
    publish: true,
    timeout: 10,
  });
  return { lambda };
}