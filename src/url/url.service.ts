import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Url } from '../schemas/url.schema';
import { CreateUrlDto } from '../dto/create-url.dto';
import {nanoid} from 'nanoid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UrlService {

  private readonly baseUrl : string

  constructor(
    @InjectModel(Url.name) private urlModel: Model<Url>,
    private readonly configService: ConfigService
  ) {
    this.configService.getOrThrow<string>('BASE_URL');
  }

  
  private generateShortCode(): string {
    return nanoid(7);
  }

  // validate url
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // shorten url
  async shortenUrl(createUrlDto: CreateUrlDto): Promise<any> {
    const { longUrl } = createUrlDto;

    if (!this.isValidUrl(longUrl)) {
      throw new BadRequestException('Invalid URL format. Please provide a valid URL including http:// or https://');
    }

    // duplicate url
    const existingUrl = await this.urlModel.findOne({ longUrl }).exec();
    
    if (existingUrl) {
      return {
        longUrl: existingUrl.longUrl,
        shortUrl: `${this.baseUrl}/${existingUrl.shortCode}`,
        shortCode: existingUrl.shortCode,
        createdAt: existingUrl.createdAt,
        clicks: existingUrl.clicks,
      };
    }

    // Generate unique short code
    let shortCode: string = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      shortCode = this.generateShortCode();
      const existing = await this.urlModel.findOne({ shortCode }).exec();
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new InternalServerErrorException('Failed to generate unique short code after multiple attempts');
    }

    // create url
    const newUrl = new this.urlModel({
      longUrl,
      shortCode, 
      clicks: 0,
    });

    await newUrl.save();

    return {
      longUrl: newUrl.longUrl,
      shortUrl: `${this.baseUrl}/${newUrl.shortCode}`,
      shortCode: newUrl.shortCode,
      createdAt: newUrl.createdAt,
      clicks: newUrl.clicks,
    };
  }

  //get original url
  async getOriginalUrl(shortCode: string): Promise<string> {
    const url = await this.urlModel.findOneAndUpdate(
      { shortCode },
      { $inc: { clicks: 1 } },
      { new: true },
    ).exec();

    if (!url) {
      throw new NotFoundException('Short URL not found');
    }

    return url.longUrl;
  }

 // stats
  async getUrlStats(shortCode: string): Promise<any> {
    const url = await this.urlModel.findOne({ shortCode }).exec();

    if (!url) {
      throw new NotFoundException('Short URL not found');
    }

    return {
      longUrl: url.longUrl,
      shortCode: url.shortCode,
      shortUrl: `${this.baseUrl}/${url.shortCode}`,
      clicks: url.clicks,
      createdAt: url.createdAt,
    };
  }

  // get all
  async getAllUrls(): Promise<any[]> {
    const urls = await this.urlModel.find().sort({ createdAt: -1 }).exec();
    return urls.map(url => ({
      longUrl: url.longUrl,
      shortCode: url.shortCode,
      shortUrl: `${this.baseUrl}/${url.shortCode}`,
      clicks: url.clicks,
      createdAt: url.createdAt,
    }));
  }

  // del url
  async deleteUrl(shortCode: string): Promise<{ deleted: boolean }> {
    const result = await this.urlModel.deleteOne({ shortCode }).exec();
    return { deleted: result.deletedCount > 0 };
  }
}