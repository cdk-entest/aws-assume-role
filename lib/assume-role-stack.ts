import { Stack, StackProps, aws_iam, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Effect } from "aws-cdk-lib/aws-iam";

interface AssumeRoleProps extends StackProps {
  account_id_guest: string;
}

export class AssumeRoleStack extends Stack {
  constructor(scope: Construct, id: string, props: AssumeRoleProps) {
    super(scope, id, props);

    const role = new aws_iam.Role(this, "AssumedRoleByGuestAccount", {
      roleName: "AssumedRoleByGuestAccount",
      assumedBy: new aws_iam.AccountPrincipal(props.account_id_guest),
      description: "enable a guest account to access s3",
    });

    role.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:*"],
        resources: ["*"],
      })
    );

    role.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: ["*"],
      })
    );

    new CfnOutput(this, "RoleArnOutput", {
      value: role.roleArn,
    });
  }
}
