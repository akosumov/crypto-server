const UserModel = require('../models/user-model')	
const bcrypt = require('bcrypt')
const uuid = require('uuid')
const mailService = require('./mail-service')
const tokenService = require('./token-service')
const UserDto = require('../dtos/user-dto')
const ApiError = require('../exeptions/api-error')

class UserService {
	async registration(email, password) {
		const candidate = await UserModel.findOne({email})
		if (candidate) {
			throw ApiError.BadRequest(`A user with this email: ${email} is already registered.`)
		}

		const hash = await bcrypt.hash(password, 3)
		const activationLink = uuid.v4()
		const user = await UserModel.create({
			email,
			password: hash,
			activationLink,
		})
		await mailService.sendActivationMail(email,`${process.env.API_URL}/api/activate/${activationLink}`)

		const userDto = new UserDto(user)
		const tokens = tokenService.generateTokens({ ...userDto })
		await tokenService.saveToken(userDto.id, tokens.refreshToken)

		return {
			...tokens,
			user: userDto,
		}
	}
	async activate(activationLink){
		const user  = await UserModel.findOne({activationLink})
		if(!user){
			throw ApiError.BadRequest('Incorrect activation link')
		}
		user.isActivated = true
		await user.save()
	}
	
	async login(email,password){
		const user = await UserModel.findOne({email})
		if(!user){
			throw ApiError.BadRequest('The user, under such mail is not registered !')
		}
		const isPassEquals = await bcrypt.compare(password, user.password)

		if(!isPassEquals){
			throw ApiError.BadRequest('The password is wrong !')
		}

		const userDto = new UserDto(user)

		const tokens = tokenService.generateTokens({...userDto})

		await tokenService.saveToken(userDto.id, tokens.refreshToken)

		return {
			...tokens,
			user: userDto,
		}
	}

	async logout(refreshToken){
		const token = await tokenService.removeToken(refreshToken)
		return token
	}

	async refresh(refreshToken){
		if(!refreshToken){
			throw ApiError.UnauthorizedError()
		}
		const userData = tokenService.validateRefreshToken(refreshToken)
		const tokenFromDb = await tokenService.findToken(refreshToken)
		if(!userData || !tokenFromDb){
			throw ApiError.UnauthorizedError()
		}

		const user = await UserModel.findById(userData.id)
		const userDto = new UserDto(user)
		const tokens = tokenService.generateTokens({...userDto})
		await tokenService.saveToken(userDto.id, tokens.refreshToken)

		return {
			...tokens,
			user: userDto,
		}
	}

	async getAllUsers(){
		const users = await UserModel.find()
		return users
	}

}

module.exports = new UserService()
