import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UMS API',
      version: '1.0.0',
      description: 'User Management System API covering auth, profile, and admin operations.'
    },
    servers: [{ url: 'http://localhost:4000' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Alice' },
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            password: { type: 'string', format: 'password', example: 'Password1!' },
            role: {
              type: 'string',
              enum: ['USER', 'ADMIN'],
              description: 'Account role (requires adminSecret when ADMIN)',
              example: 'USER'
            },
            adminSecret: {
              type: 'string',
              description: 'Secret required to register an administrator account when role=ADMIN'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'JWT token' },
            role: { type: 'string', enum: ['USER', 'ADMIN'], description: 'Role tied to the token' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            password: { type: 'string', format: 'password', example: 'Password1!' }
          }
        },
        Profile: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'User ID' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            preferences: {
              type: 'object',
              properties: {
                theme: { type: 'string', enum: ['light', 'dark'] },
                language: { type: 'string' }
              }
            }
          }
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            preferences: {
              type: 'object',
              properties: {
                theme: { type: 'string', enum: ['light', 'dark'] },
                language: { type: 'string' }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            name: { type: 'string' },
            reason: { type: 'string' },
            status: { type: 'integer' },
            details: { type: 'object' },
            stack: { type: 'string' }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Registration and login' },
      { name: 'Users', description: 'Profile operations' },
      { name: 'Admin', description: 'Administrative user management' },
      { name: 'System', description: 'Service health and metrics' }
    ],
    paths: {
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterRequest' }
              }
            }
          },
          responses: {
            201: {
              description: 'User registered',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            },
            403: {
              description: 'Admin registration blocked or secret invalid',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            409: {
              description: 'Email already registered',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            400: {
              description: 'Validation failure',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Authenticate user and issue token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' }
              }
            }
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            },
            401: {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/me': {
        get: {
          tags: ['Users'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Profile returned',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Profile' }
                }
              }
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            404: {
              description: 'Profile not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        },
        put: {
          tags: ['Users'],
          summary: 'Update current user profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateProfileRequest' }
              }
            }
          },
          responses: {
            200: {
              description: 'Updated profile',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Profile' }
                }
              }
            },
            400: {
              description: 'Validation failure',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            404: {
              description: 'Profile not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        },
        delete: {
          tags: ['Users'],
          summary: 'Delete current account',
          security: [{ bearerAuth: [] }],
          responses: {
            204: { description: 'Account deleted' },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            404: {
              description: 'Profile not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/admin/users': {
        get: {
          tags: ['Admin'],
          summary: 'List all user profiles',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'List of profiles',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Profile' }
                  }
                }
              }
            },
            403: {
              description: 'Forbidden',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Service health status',
          responses: {
            200: {
              description: 'Service healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { status: { type: 'string', example: 'ok' } }
                  }
                }
              }
            }
          }
        }
      },
      '/metrics': {
        get: {
          tags: ['System'],
          summary: 'Prometheus metrics',
          responses: {
            200: {
              description: 'Metrics output',
              content: {
                'text/plain': { schema: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  },
  apis: []
};

export const swaggerSpec = swaggerJSDoc(options);
export function mountSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}