import * as aws from "@pulumi/aws";

export function createVpc() {
    const vpc = new aws.ec2.Vpc("main-vpc", {
        cidrBlock: "10.0.0.0/16",
        enableDnsHostnames: true,
        tags: { Name: "pulumi-vpc-acg" },
    });

    return vpc;
}