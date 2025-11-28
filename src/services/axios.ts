import axios from 'axios'

export const api = axios.create({
    baseURL: 'https://api-sandbox.asaas.com/v3',
    withCredentials: true,
})