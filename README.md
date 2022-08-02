---
title: Chakra UI Hackathon 22’ Recap
description:
  Last month we had the first-ever Chakra UI Hackathon, which we tagged the
  Chakrathon 22'. The Hackathon was held from May 3rd to May 20th, 2022, with
  participants from various parts of the world involved.
author: estheragbaje
publishedDate: 06/23/2022
date: 2022-07-24
---

For example, dev account wants to access S3 in prod account. [Github](https://github.com/entest-hai/aws-assume-role)

## CDK Stack

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
new CfnOutput(this, "AssumedRoleByGuesAccount", {
  value: role.roleArn,
});
```

## Assume the role

From the dev account, assume the role as a AWSCLI Session

```shell
aws sts assume-role --role-arn "arn:aws:iam:PROD_ACCOUNT_ID:role/AssumedRoleByGuesAccount" --role-session-name session
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
