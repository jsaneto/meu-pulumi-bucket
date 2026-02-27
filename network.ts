import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export const createSecurityGroup = (vpcId: pulumi.Input<string>, nameSuffix: string) => {
    return new aws.ec2.SecurityGroup(`sg-${nameSuffix}`, {
        vpcId: vpcId,
        description: `Security Group para ${nameSuffix}`,
        ingress: [
            { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 3306, toPort: 3306, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 5432, toPort: 5432, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 6379, toPort: 6379, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"], description: "HTTPS para Endpoints" },
            // Permite trafego interno entre as redes
            { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["10.0.0.0/16", "172.31.0.0/16"], description: "Trafego interno VPCs" },
        ],
        egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
    });
};