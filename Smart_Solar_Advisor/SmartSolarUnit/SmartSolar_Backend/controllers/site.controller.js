import SiteModel from '../models/site.model.js';

class SiteController {
  async getAll(req, res) {
    try {
      const { status, customer } = req.query;
      const userRole = req.user?.role;
      const userEmail = req.user?.email;
      
      let sites;
      
      // If user is a site owner, only show their own sites
      if (userRole === 'site_owner' && userEmail) {
        // Convert email to customer_name format (same logic as frontend)
        const customerName = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        
        if (status) {
          // Get sites by customer first, then filter by status
          const customerSites = await SiteModel.getByCustomer(customerName);
          sites = customerSites.filter(s => s.status === status);
        } else {
          sites = await SiteModel.getByCustomer(customerName);
        }
      } else {
        // Admin users can see all sites or filter
      if (status) {
        sites = await SiteModel.getByStatus(status);
      } else if (customer) {
        sites = await SiteModel.getByCustomer(customer);
      } else {
        sites = await SiteModel.getAll();
        }
      }

      res.json({
        success: true,
        data: sites,
        count: sites.length
      });
    } catch (error) {
      console.error('Get all sites error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sites'
      });
    }
  }

  async getById(req, res) {
    try {
      const { siteId } = req.params;
      const userRole = req.user?.role;
      const userEmail = req.user?.email;
      
      const site = await SiteModel.getById(siteId);

      if (!site) {
        return res.status(404).json({
          success: false,
          message: 'Site not found'
        });
      }

      // If user is a site owner, verify they own this site
      if (userRole === 'site_owner' && userEmail) {
        const customerName = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        if (site.customer_name !== customerName) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You do not have permission to view this site.'
          });
        }
      }

      res.json({
        success: true,
        data: site
      });
    } catch (error) {
      console.error('Get site by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch site'
      });
    }
  }

  async create(req, res) {
    try {
      const { siteId, ...siteData } = req.body;

      if (!siteId) {
        return res.status(400).json({
          success: false,
          message: 'Site ID is required'
        });
      }

      // Check if site already exists
      const existingSite = await SiteModel.getById(siteId);
      if (existingSite) {
        return res.status(409).json({
          success: false,
          message: 'Site with this ID already exists'
        });
      }

      const newSite = await SiteModel.create(siteId, siteData);

      res.status(201).json({
        success: true,
        data: newSite,
        message: 'Site created successfully'
      });
    } catch (error) {
      console.error('Create site error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create site'
      });
    }
  }

  async update(req, res) {
    try {
      const { siteId } = req.params;
      const siteData = req.body;

      const existingSite = await SiteModel.getById(siteId);
      if (!existingSite) {
        return res.status(404).json({
          success: false,
          message: 'Site not found'
        });
      }

      const updatedSite = await SiteModel.update(siteId, siteData);

      res.json({
        success: true,
        data: updatedSite,
        message: 'Site updated successfully'
      });
    } catch (error) {
      console.error('Update site error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update site'
      });
    }
  }

  async delete(req, res) {
    try {
      const { siteId } = req.params;

      const existingSite = await SiteModel.getById(siteId);
      if (!existingSite) {
        return res.status(404).json({
          success: false,
          message: 'Site not found'
        });
      }

      await SiteModel.delete(siteId);

      res.json({
        success: true,
        message: 'Site deleted successfully'
      });
    } catch (error) {
      console.error('Delete site error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete site'
      });
    }
  }

  async getStats(req, res) {
    try {
      const allSites = await SiteModel.getAll();
      
      const stats = {
        total: allSites.length,
        running: allSites.filter(s => s.status === 'running').length,
        completed: allSites.filter(s => s.status === 'completed').length,
        maintenance: allSites.filter(s => s.status === 'maintenance').length,
        totalCapacity: allSites.reduce((sum, s) => sum + (s.system_kw || 0), 0)
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stats'
      });
    }
  }
}

export default new SiteController();
