import * as aws from "@pulumi/aws";

export const createSecurityGroup = () => {
    const sg = new aws.ec2.SecurityGroup("acesso-web-rds-sg", {
        description: "Permite SSH, HTTP, MySQL, PostgreSQL, Redis e VPC Endpoints",
        
        ingress: [
            // Regras padrao (Mantendo suas portas originais)
            { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 3306, toPort: 3306, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 5432, toPort: 5432, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 6379, toPort: 6379, cidrBlocks: ["0.0.0.0/0"] },

            // --- CORRECAO: Sem acentos nas descricoes ---
            {
                protocol: "tcp",
                fromPort: 443,
                toPort: 443,
                cidrBlocks: ["0.0.0.0/0"], 
                description: "Acesso HTTPS para VPC Endpoints", // "Acesso" sem acento se preferir, mas o 'e' e 'o' estao ok
            },

            {
                protocol: "-1", 
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["172.31.0.0/16"], 
                description: "Permite trafego da VPC Default via Peering", // Removido 'á' e 'ê'
            },
        ],

        egress: [
            {
                protocol: "-1", 
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
    });

    return sg;
};