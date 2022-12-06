import express from 'express'
import cors from 'cors';
import net from 'net'
import csv from './routes/csv.route';

const app: express.Express = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1/csv', csv);

export default (): void => {
    let port = 3000;
    const server = app.listen(port, () => {
        port = (server.address() as net.AddressInfo).port
        console.log('Server is ready on ' + port)
    })
}
