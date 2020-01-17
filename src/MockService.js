'use strict'

const InternalRequestError = require('./errors/InternalRequestError')

class MockService {
  constructor() {
    this._operationsStack = []
  }

  mock(operationId, parameters, result) {
    const mock = { operationId, parameters, result }
    this._operationsStack.push(mock)
  }

  request(operationId) {
    const index     = this._operationsStack.findIndex(operation => operation.operationId === operationId)
    const operation = this._operationsStack[index]

    if (!operation) {
      throw new Error(`Operation mock is not found for \`${operationId}\``)
    }

    this._operationsStack.splice(index, 1)

    if (operation.result.error) {
      const { parameters, result: { error } } = operation
      throw new InternalRequestError({ operationId, parameters }, error)
    }

    return operation.result
  }

  done() {
    const isAllMocksResolved = this._operationsStack.length === 0

    if (!isAllMocksResolved) {
      const json = JSON.stringify(this._operationsStack, null, 2)

      this._operationsStack = []
      throw new Error(`Following mocks have not been resolved: ${json}`)
    }
  }
}

module.exports = MockService
