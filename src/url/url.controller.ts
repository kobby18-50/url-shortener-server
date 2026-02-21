import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Res, 
  HttpStatus, 
  HttpCode,
  NotFoundException, 
  Delete
} from '@nestjs/common';
import type { Response } from 'express';
import { UrlService } from './url.service';
import { CreateUrlDto } from '../dto/create-url.dto';

@Controller()
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  // shorten url
  @Post('shorten')
  @HttpCode(HttpStatus.CREATED)
  async shortenUrl(@Body() createUrlDto: CreateUrlDto) {
    return this.urlService.shortenUrl(createUrlDto);
  }

  
  // get url by short code
  @Get(':shortCode')
  async redirectToOriginal(
    @Param('shortCode') shortCode: string,
    @Res() res: Response,
  ) {
    try {
      const longUrl = await this.urlService.getOriginalUrl(shortCode);
      return res.redirect(HttpStatus.FOUND, longUrl);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Short URL not found',
        });
      }
      throw error;
    }
  }

  // get url stats
  @Get('stats/:shortCode')
  async getUrlStats(@Param('shortCode') shortCode: string) {
    return this.urlService.getUrlStats(shortCode);
  }

  // get all url
  @Get('urls/all')
  async getAllUrls() {
    return this.urlService.getAllUrls();
  }

  //delete url

  @Delete(':shortCode')
  async deleteUrl(@Param('shortCode') shortCode : string) {
    return this.urlService.deleteUrl(shortCode)
  }

  


}