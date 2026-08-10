import { createBuilder } from './.modules/aspire.js';

const builder = await createBuilder();

const mongo = await builder.addMongoDB('mongo');
const mongoUri = await (await mongo.connectionStringExpression.get()).getValue();

const backend = await builder.addJavaScriptApp('game-api', '../../servers/game-api', { runScriptName: 'dev' })
  .withHttpEndpoint({ env: 'PORT', name: 'http' })
  .withReference(mongo)
  .withEnvironment('MONGODB_URI', mongoUri ?? '')
  .withEnvironment('MONGODB_DATABASE', 'minefield');

const frontend = await builder.addViteApp('game-web', '../../apps/game-web')
  .withReference(backend)
  .withEnvironment('VITE_API_URL', await backend.getEndpoint('http'));

await builder.build().run();