import * as aws from "@pulumi/aws";

export const createSecurityGroup = () => {
    const sg = new aws.ec2.SecurityGroup("acesso-web-asg", {
        description: "Permite SSH e HTTP (Porta 80) de entrada",
        ingress: [
            // Regra para SSH
            {
                protocol: "tcp",
                fromPort: 22,
                toPort: 22,
                cidrBlocks: ["0.0.0.0/0"],
            },
            // --- NOVA REGRA: Liberando Porta 80 ---
            {
                protocol: "tcp",
                fromPort: 80,
                toPort: 80,
                cidrBlocks: ["0.0.0.0/0"], // Aberto ao mundo
            },
        ],
        egress: [
            {
                protocol: "-1", // Todos os protocolos
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
    });

    return sg;
};