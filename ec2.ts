import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export const createEC2Instance = (securityGroupId: pulumi.Output<string>) => {
    // Busca automática pela AMI do Ubuntu 22.04 mais recente
    const ami = aws.ec2.getAmi({
        filters: [{ name: "name", values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"] }],
        owners: ["099720109477"], // Owner ID oficial da Canonical
        mostRecent: true,
    });

    return new aws.ec2.Instance("minha-instancia", {
        ami: ami.then(a => a.id), // Usa o ID encontrado na busca
        instanceType: "t3.micro",
        vpcSecurityGroupIds: [securityGroupId],
        tags: { Name: "Servidor-Node" },
    });
};
