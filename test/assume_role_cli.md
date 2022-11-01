## Introduction

- assume role for cross-account access
- aws iam privilege escaltion
- expoliting create-policy-version [HERE](https://bishopfox.com/blog/privilege-escalation-in-aws)

## Create a IAM Role

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

## Create an Iam User

create an iam user (no aws console access)

```bash
aws iam create-user --user-name demo1
```

create an access key, take note the credentials returned

```bash
aws iam create-access-key --user-name cli-iam-demo
```

then configure aws profile

```bash
aws configure
```

## Create User Console Access

this is optinal

```bash
aws iam create-login-profile --generate-cli-skeleton > test.json
```

fill username and password into the temlate test.json and

```bash
aws iam create-login-profile --cli-input file://test.jon
```

## Apply a Policy to The User

allow the use to create new versions of policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PrivEsc1",
      "Effect": "Allow",
      "Action": "iam:CreatePolicyVersion",
      "Resource": "arn:aws:iam::*:policy/*"
    }
  ]
}
```

create a policy and take note the policy arn

```bash
aws iam create-policy \
  --policy-name AlloCreatePolicyVersion \
  --policy-document file://policy.json
```

attach

```bash
aws iam attach-user-policy \
  --user cli-iam-demo \
  --policy-arn $POLICY_ARN
```

## Priveldge Escalation

now the user upgrate their permission to admin

```bash
aws iam create-policy-version \
-policy-arn $POLICY_ARN \
--policy-document file://admin_policy.json \
--set-as-default
```

## Helper

this will create a template for the input parameters so you know what to provide

```bash
aws iam create-policy --generate-cli-json
```

## Query contain

```bash
aws iam list-roles --query 'Roles[?contains(RoleName,`NoteBook`)]'
```
