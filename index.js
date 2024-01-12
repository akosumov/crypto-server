require('dotenv').config()

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const router = require('./router/index')
const errorMiddleware = require('./middlewares/error-middleware')


const app = express()
const PORT = process.env.PORT



app.use(express.json())
app.use(cookieParser())
app.use(cors())
app.use('/api', router)
app.use(errorMiddleware)

const start = async () => {
	try {
		await mongoose.connect(process.env.DB_URL)
		console.log(
			'Pinged your deployment. You successfully connected to MongoDB!'
		)
		app.listen(PORT, () =>
			console.log(`server has been started on ${PORT} port`)
		)
	} catch (e) {
		console.log(e)
	}
}

start()
