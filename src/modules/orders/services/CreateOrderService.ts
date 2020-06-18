import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError("This customer doesn't exists", 400);
    }

    if (!products) {
      throw new AppError("Don't have products in the car.", 400);
    }

    const idsProducts = products.map(product => ({ id: product.id }));

    const orderProducts = await this.productsRepository.findAllById(
      idsProducts,
    );

    if (idsProducts.length !== orderProducts.length) {
      throw new AppError("One or more products doesn't exists.", 400);
    }

    const parsedProducts = orderProducts.map(product => {
      products.forEach(prod => {
        if (prod.id === product.id && prod.quantity > product.quantity) {
          throw new AppError('One or more products unavailable quantity.', 400);
        }

        return prod;
      });

      return {
        product_id: product.id,
        quantity: products.filter(item => item.id === product.id)[0].quantity,
        price: product.price,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: parsedProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
