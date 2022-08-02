#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AssumeRoleStack } from "../lib/assume-role-stack";

const app = new cdk.App();
new AssumeRoleStack(app, "AssumeRoleStack", {
  account_id_guest: "",
});
