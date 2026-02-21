import * as aws from "@pulumi/aws";

/**
 * Cria um Security Group (SG) para controlar o tráfego de rede.
 * Este grupo agora permite acesso Web, SSH e conexões ao Banco de Dados RDS.
 */
export const createSecurityGroup = () => {
    const sg = new aws.ec2.SecurityGroup("acesso-web-rds-sg", {
        description: "Permite SSH, HTTP e MySQL (RDS) de entrada",
        
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
            // Essencial para que sua aplicação ou você consigam conectar no RDS
            {
                protocol: "tcp",
                fromPort: 3306,
                toPort: 3306,
                // Em um ambiente real, restringiríamos o CIDR ao IP da aplicação
                cidrBlocks: ["0.0.0.0/0"], 
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