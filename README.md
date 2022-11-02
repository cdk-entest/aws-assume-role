---
title: Introduction to AWS Assume Role
description: Simple assume role by an iam user to access s3 in another account
author: haimtran
publishedDate: 08/01/2022
date: 2022-08-01
---

## Introduction

[Github](https://github.com/entest-hai/aws-assume-role) explains basics of cross-account access by assuming role.

- dev account access prod account (iam users)

![iam_user_assume_role](https://user-images.githubusercontent.com/20411077/199384255-0e0d328a-c5a6-4d34-ad84-82940b3dfb9f.png)

- a lambda function from dev account access s3 in prod account
![lambda_assume_role](https://user-images.githubusercontent.com/20411077/199384393-7e62c379-552a-4ef1-9f70-475e89c29a09.png)


in production account

- create a role and specify which principal (dev account arn, lambda function arn) can assume this role
- policy and speify what permission this role can do






## Trust Policy in Prod Account

the trust policy in prod account tells that $DEV_ACCOUNT can assume this role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PolicyForAccessingS3",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::$DEV_ACCOUNT:user/$DEV_USER_NAME"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

the trust policy in prod account tells that the lambda-arn in another account can assume this role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LambdaAssumeRole",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::$DEV_ACCOUNT:role/service-role/lambda-role"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

a policy attached to this role to grant s3 access (access s3 buckets in Prod account) to the role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AccessS3Policy",
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": "*"
    }
  ]
}
```

## Using CLI

please export PRODUCT_ACCOUNT=1111-2222-3333-4444 we need to provide a trust policy to tell who or what service can assume the role

```bash
aws iam create-role \
--role-name RoleForAccessS3 \
--assume-role-policy-document \
file://trust_policy.json
```

update an existing role trust policy (relationship)

```bash
aws iam update-assume-role-policy \
--role-name RoleForAccessS3 \
--policy-document \
file://trust_policy.json
```

create a policy to allow accessing s3

```bash
aws iam create-policy \
--policy-name AccessS3PolicyCrossAccount \
--policy-document file://policy_access_s3.json
```

attach an policy to a role

```bash
aws iam attach-role-policy \
--role-name RoleForAccessS3 \
--policy-arn arn:aws:iam::$PRODUCT_ACCOUNT:policy/AccessS3PolicyCrossAccount
```

assume role from dev account

```bash
aws sts assume-role \
--role-arn arn:aws:iam::$PRODUCT_ACCOUNT:role/RoleForAccessS3 \
--role-session-name session
```

revoke to stop effectiveness of the role

## Using CDK Stack

In the prod account create a role and tell who will assume the role. Create this stack (role) in the prod account.

```tsx
const role = new aws_iam.Role(this, "AssumedRoleByGuestAccount", {
  roleName: "AssumedRoleByGuestAccount",
  assumedBy: new aws_iam.AccountPrincipal(props.account_id_guest),
  description: "enable a guest account to access s3",
});
```

attach a policy to tell what this role can do

```tsx
role.attachInlinePolicy(
  new aws_iam.Policy(this, "PolicyAllowGuestAccountToAccessS3", {
    statements: [
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        actions: ["s3:*"],
        resources: ["*"],
      }),
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: ["*"],
      }),
    ],
  })
);
```

take note the role arn and give it to the dev account

```tsx
new CfnOutput(this, "AssumeRoleArn", {
  value: role.roleArn,
});
```

## Assume the role

From the dev account, assume the role as a AWSCLI Session

```shell
aws sts assume-role --role-arn "arn:aws:iam:PROD_ACCOUNT_ID:role/AssumedRoleByGuesAccount" \
  --role-session-name session
```

Then take note temporary credentials

```
export AWS_ACCESS_KEY_ID="AWS_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="AWS_SECRET_ACCESS_KEY"
export AWS_SESSION_TOKEN="AWS_SESSION_TOKEN"
```

Test it

```shell
aws s3 ls
```

## Lambda Function

please setup permission for this lambda to do sts:AssumeRole, and also double check that in the production account, this lambda-arn can assume the role in the production account.

```py
import os
import json
import uuid
import boto3

BUCKET_NAME = "PROD_ACCOUNT_BUCKET"
ROLE_ARN = "arn:aws:iam::$PROD_ACCOUNT_ID:role/DevAccountAccessS3Role"

def write_to_s3_with_credentials():
    """
    configure s3 client with credentials
    """
    s3Client = boto3.client(
        "s3",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY"],
        aws_secret_access_key=os.environ["AWS_SECRET_KEY"],
        aws_session_token=os.environ["AWS_SESSION_TOKEN"],
    )
    # write data to s3
    try:
        s3Client.put_object(
            Bucket=BUCKET_NAME, Key=str(uuid.uuid4()), Body=b"Hello HaiTran"
        )
    except:
        print("error write to s3")


def sts_assume_role_token():
    """
    get token when assume a role can be cross-account
    """
    stsClient = boto3.client("sts")
    credentials = stsClient.assume_role(
        RoleArn=ROLE_ARN, RoleSessionName="RoleSessionDemo"
    )
    print(credentials)
    #
    os.environ["AWS_ACCESS_KEY"] = credentials["Credentials"]["AccessKeyId"]
    os.environ["AWS_SECRET_KEY"] = credentials["Credentials"]["SecretAccessKey"]
    os.environ["AWS_SESSION_TOKEN"] = credentials["Credentials"]["SessionToken"]

def lambda_handler(event, context):
    """
    write to s3 in another account
    from the product account, please specify that
    which lambda (ARN) can assume this role.
    """
    # assume role and get credentials
    sts_assume_role_token()
    # write to s3 in another account
    write_to_s3_with_credentials()
    # return
    return {"statusCode": 200, "body": json.dumps("Hello from Lambda!")}
```
