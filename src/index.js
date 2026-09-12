import dotenv from "dotenv";

dotenv.config({

    path: "./.env"

});

const app = (await import("./app.js")).default;

const port=process.env.PORT || 3000;

app.listen(port,()=>{

    console.log(`Example app listening on port http://localhost:${port}`);

});
