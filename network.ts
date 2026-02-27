import * as aws from "@pulumi/aws";

export const createSecurityGroup = () => {
    const sg = new aws.ec2.SecurityGroup("acesso-web-rds-sg", {
        description: "Permite SSH, HTTP, MySQL, PostgreSQL, Redis e VPC Endpoints",
        
        ingress: [
            // SSH, HTTP, MySQL, PostgreSQL e Redis (Mantendo seus originais)
            { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 3306, toPort: 3306, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 5432, toPort: 5432, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 6379, toPort: 6379, cidrBlocks: ["0.0.0.0/0"] },

            // --- ADIÇÃO PARA VPC ENDPOINTS (HTTPS) ---
            // Necessário para Interface Endpoints (Secrets Manager, etc)
            {
                protocol: "tcp",
                fromPort: 443,
                toPort: 443,
                cidrBlocks: ["0.0.0.0/0"], 
                description: "Acesso para VPC Endpoints",
            },

            // --- ADIÇÃO PARA PEERING (Tráfego Interno) ---
            // Permite que a VPC Default (geralmente 172.31.0.0/16) fale com esta VPC
            {
                protocol: "-1", // Todos os protocolos
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["172.31.0.0/16"], 
                description: "Aceita todo o tráfego vindo da VPC Default via Peering",
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