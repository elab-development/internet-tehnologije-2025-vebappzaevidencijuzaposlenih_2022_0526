import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API za evidenciju zaposlenih",
      version: "1.0.0",
      description: "Swagger dokumentacija za aplikaciju za evidenciju prisustva i aktivnosti zaposlenih.",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["./src/app/api/**/*.ts"],
});