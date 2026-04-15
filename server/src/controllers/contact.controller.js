const { Contact } = require('../models');
const { success, error, paginated } = require('../utils/apiResponse');
const { Op } = require('sequelize');

// POST /api/v1/contact (public)
async function createContact(req, res, next) {
  try {
    const { name, email, phone, subject, message } = req.body;
    const contact = await Contact.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      subject: subject?.trim() || null,
      message: message.trim(),
      status: 'new',
    });
    return success(res, contact, 'Contact submission received. We will get back to you soon.', 201);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/contacts
async function getAllContacts(req, res, next) {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search?.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: q } },
        { email: { [Op.like]: q } },
        { subject: { [Op.like]: q } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Contact.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
    });

    return paginated(res, rows, {
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/contacts/:id
async function getContact(req, res, next) {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return error(res, 'Contact not found', 404);
    return success(res, contact);
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/admin/contacts/:id
async function updateContact(req, res, next) {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return error(res, 'Contact not found', 404);

    const { status, admin_notes } = req.body;
    await contact.update({ status, admin_notes });
    return success(res, contact, 'Contact updated');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/admin/contacts/:id
async function deleteContact(req, res, next) {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return error(res, 'Contact not found', 404);
    await contact.destroy();
    return success(res, null, 'Contact deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createContact,
  getAllContacts,
  getContact,
  updateContact,
  deleteContact,
};
