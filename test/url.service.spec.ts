import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { UrlService } from '../src/url/url.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UrlService', () => {
  let service: UrlService;
  let mockUrlModel: any;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockUrl = {
    _id: 'some-id',
    longUrl: 'https://example.com',
    shortCode: 'abc123',
    clicks: 0,
    createdAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    // Mock the mongoose model
    mockUrlModel = function() {
      return {
        ...mockUrl,
        save: jest.fn().mockResolvedValue(mockUrl),
      };
    };

    mockUrlModel.findOne = jest.fn();
    mockUrlModel.findOneAndUpdate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlService,
        {
          provide: getModelToken('Url'),
          useValue: mockUrlModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UrlService>(UrlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shortenUrl', () => {
    it('should create a shortened URL', async () => {
      const createUrlDto = { longUrl: 'https://example.com' };
      
      // Mock that URL doesn't exist
      mockUrlModel.findOne.mockResolvedValueOnce(null);
      
      // Mock that short code is unique
      mockUrlModel.findOne.mockResolvedValueOnce(null);

      const result = await service.shortenUrl(createUrlDto);

      expect(result).toBeDefined();
      expect(result.longUrl).toBe(createUrlDto.longUrl);
      expect(result.shortCode).toBeDefined();
      expect(result.shortUrl).toBeDefined();
    });

    it('should throw BadRequestException for invalid URL', async () => {
      const createUrlDto = { longUrl: 'invalid-url' };

      await expect(service.shortenUrl(createUrlDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return existing URL if already shortened', async () => {
      const createUrlDto = { longUrl: 'https://example.com' };
      
      mockUrlModel.findOne.mockResolvedValueOnce({
        longUrl: 'https://example.com',
        shortCode: 'existing123',
        createdAt: new Date(),
      });

      const result = await service.shortenUrl(createUrlDto);

      expect(result.longUrl).toBe(createUrlDto.longUrl);
      expect(result.shortCode).toBe('existing123');
    });
  });

  describe('getOriginalUrl', () => {
    it('should return original URL and increment clicks', async () => {
      const shortCode = 'abc123';
      const mockDoc = {
        longUrl: 'https://example.com',
        shortCode: 'abc123',
      };

      mockUrlModel.findOneAndUpdate.mockResolvedValueOnce(mockDoc);

      const result = await service.getOriginalUrl(shortCode);

      expect(result).toBe('https://example.com');
      expect(mockUrlModel.findOneAndUpdate).toHaveBeenCalledWith(
        { shortCode },
        { $inc: { clicks: 1 } },
        { new: true },
      );
    });

    it('should throw NotFoundException for non-existent short code', async () => {
      const shortCode = 'nonexistent';
      
      mockUrlModel.findOneAndUpdate.mockResolvedValueOnce(null);

      await expect(service.getOriginalUrl(shortCode)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUrlStats', () => {
    it('should return URL statistics', async () => {
      const shortCode = 'abc123';
      const mockDoc = {
        longUrl: 'https://example.com',
        shortCode: 'abc123',
        clicks: 5,
        createdAt: new Date(),
      };

      mockUrlModel.findOne.mockResolvedValueOnce(mockDoc);

      const result = await service.getUrlStats(shortCode);

      expect(result.longUrl).toBe(mockDoc.longUrl);
      expect(result.shortCode).toBe(mockDoc.shortCode);
      expect(result.clicks).toBe(mockDoc.clicks);
    });

    it('should throw NotFoundException for non-existent short code', async () => {
      const shortCode = 'nonexistent';
      
      mockUrlModel.findOne.mockResolvedValueOnce(null);

      await expect(service.getUrlStats(shortCode)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});