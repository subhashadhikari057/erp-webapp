import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuperadminService } from './superadmin.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ManageCompanyModulesDto } from './dto/manage-company-modules.dto';
import { CompanyResponseDto, CompanyListResponseDto } from './dto/company-response.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { SuperadminGuard } from './guards/superadmin.guard';

@Controller('superadmin')
@UseGuards(JwtGuard, SuperadminGuard)
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Post('companies')
  async createCompany(@Body() createCompanyDto: CreateCompanyDto): Promise<CompanyResponseDto> {
    return this.superadminService.createCompany(createCompanyDto);
  }

  @Get('companies')
  async getAllCompanies(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<CompanyListResponseDto> {
    const pageNum = parseInt(page || '1') || 1;
    const limitNum = parseInt(limit || '10') || 10;
    return this.superadminService.getAllCompanies(pageNum, limitNum, search);
  }

  @Get('companies/:companyId')
  async getCompanyById(@Param('companyId') companyId: string): Promise<CompanyResponseDto> {
    return this.superadminService.getCompanyById(companyId);
  }

  @Patch('companies/:companyId')
  async updateCompany(
    @Param('companyId') companyId: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    return this.superadminService.updateCompany(companyId, updateCompanyDto);
  }

  @Post('companies/:companyId/modules')
  async manageCompanyModules(
    @Param('companyId') companyId: string,
    @Body() modulesDto: ManageCompanyModulesDto,
  ): Promise<{ message: string }> {
    return this.superadminService.manageCompanyModules(companyId, modulesDto);
  }

  @Delete('companies/:companyId')
  async deleteCompany(@Param('companyId') companyId: string): Promise<{ message: string }> {
    return this.superadminService.deleteCompany(companyId);
  }
}