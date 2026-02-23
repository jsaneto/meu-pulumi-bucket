import * as aws from "@pulumi/aws";

/**
 * Cria um Security Group (SG) para controlar o tráfego de rede.
 * Este grupo permite acesso Web, SSH e conexões simultâneas para MySQL e PostgreSQL.
 */
export const createSecurityGroup = () => {
    const sg = new aws.ec2.SecurityGroup("acesso-web-rds-sg", {
        description: "Permite SSH, HTTP, MySQL e PostgreSQL de entrada",
        
        // --- REGRAS DE ENTRADA (INGRESS) ---
        ingress: [
            // Regra para SSH (Acesso ao Terminal)
            {
                protocol: "tcp",
                fromPort: 22,
                toPort: 22,
                cidrBlocks: ["0.0.0.0/0"], 
            },
            
            // Regra para HTTP (Acesso Web via porta 80)
            {
                protocol: "tcp",
                fromPort: 80,
                toPort: 80,
                cidrBlocks: ["0.0.0.0/0"], 
            },

            // Regra para MySQL/Aurora (Porta 3306)
            // Mantida ativa para o banco que já está em uso
            {
                protocol: "tcp",
                fromPort: 3306,
                toPort: 3306,
                cidrBlocks: ["0.0.0.0/0"], 
            },

            // Regra para PostgreSQL (Porta 5432)
            // Nova regra adicionada para suportar o Aurora Serverless v2 PostgreSQL
            {
                protocol: "tcp",
                fromPort: 5432,
                toPort: 5432,
                cidrBlocks: ["0.0.0.0/0"], 
            },
            {
                protocol: "tcp",
                fromPort: 6379,
                toPort: 6379,
                cidrBlocks: ["0.0.0.0/0"], // No ACG, isso facilita o teste
},
        ],

        // --- REGRAS DE SAÍDA (EGRESS) ---
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