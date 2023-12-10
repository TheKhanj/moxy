import { NestFactory } from "@nestjs/core";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { UserService } from "./user/user.service";
import { ProxyStorage } from "./proxy/proxy.storage";

function bootstrapSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("Moxy")
    .setDescription("Moxy API")
    .setVersion("0.1")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  bootstrapSwagger(app);

  const userControl = app.get(UserService);
  const stats = await userControl.assert("test2");
  await userControl.update("test2", stats).catch((err) => {
    console.log(err.stack);
    throw err;
  });

  const proxyStorage = app.get(ProxyStorage);

  proxyStorage.add("test", 3001, 4001);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  await app.listen(3000);
}

bootstrap();
