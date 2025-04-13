import json
from django.shortcuts import render, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required

from checkout.models import Order

from .models import UserProfile
from .forms import UserProfileForm


@login_required
def profile(request):
    """
    Display the user's profile
    """
    profile = get_object_or_404(UserProfile, user=request.user)

    # Create new instance of the user profile form using the
    # request post data
    if request.method == 'POST':
        form = UserProfileForm(
            request.POST,
            instance=profile,
            user=request.user
            )
        if form.is_valid():
            form.save()
            messages.info(request, 'Profile updated successfully')
        else:
            messages.error(
                request, "Update failed. Please ensure the form is valid."
            )
    else:
        form = UserProfileForm(instance=profile, user=request.user)
    orders = profile.orders.all()

    template = 'profiles/profile.html'
    context = {
        'form': form,
        'orders': orders,
        'on_profile_page': True,
    }

    return render(request, template, context)


def order_history(request, order_number):
    order = get_object_or_404(Order, order_number=order_number)

    messages.info(request, (
        f'This is a past confirmation for order number {order_number}. '
        'A confirmation email was sent on the order date.'
    ))

    template = 'checkout/checkout_success.html'
    context = {
        'order': order,
        'order_items': json.loads(order.original_bag),
    }

    return render(request, template, context)
